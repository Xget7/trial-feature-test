import React, { useState, useEffect, useRef } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { Audio } from 'expo-av'
import * as Linking from 'expo-linking'
import { Ionicons } from '@expo/vector-icons'
import { RippleAtoIcon } from './RippleAtoIcon'
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant'
import { useSelectedUser } from '@/contexts/SelectedUserContext'
import { useAto } from '@/contexts/AtoContext'
import { useI18n } from '@/components/I18nProvider'

const ELEVEN_LABS_API_KEY = process.env.EXPO_PUBLIC_ELEVEN_LABS_API_KEY
const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const AUTO_RESUME_DELAY = 1000

const VOICE_IDS = {
  'es-ES': '1WXz8v08ntDcSTeVXMN2', // Spanish voice
  'en-US': 'pdoiqZrWfcY60KV2vt2G', // English voice
} as const

const getVoiceIdForLanguage = (language: string): string => {
  return VOICE_IDS[language as keyof typeof VOICE_IDS] || VOICE_IDS['es-ES']
}

interface AtoAssistantSheetProps {
  visible: boolean
  onClose: () => void
}

export const AtoAssistantSheet: React.FC<AtoAssistantSheetProps> = ({ visible, onClose }) => {
  const [inputText, setInputText] = useState('')
  const [hasPermissions, setHasPermissions] = useState(false)
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false)
  const [isTextMode, setIsTextMode] = useState(false)
  const [showingResponse, setShowingResponse] = useState(false)

  const hasAutoStartedRef = useRef(false)
  const isMountedRef = useRef(true)
  const autoResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousSpeakingRef = useRef(false)
  const responseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { currentManager } = useAto()
  const { selectedUser, isLoading: isLoadingUser,  } = useSelectedUser()
  const { t } = useI18n()

  const language = 'es-ES' // TODO: Get from user preferences or device locale

  const {
    isListening,
    isSpeaking,
    isProcessing,
    transcript,
    response,
    conversationHistory,
    startListening,
    stopListening,
    sendTextMessage,
  } = useVoiceAssistant({
    language,
    elevenLabsApiKey: ELEVEN_LABS_API_KEY,
    preferCloudTTS: true,
    useConversationalAI: true,
    voiceId: getVoiceIdForLanguage(language),
    elderlyName: selectedUser?.nickname || selectedUser?.name,
  managerId: currentManager?.id,
      onConversationEnd: () => {
      console.log('[SHEET] Conversation ended by Ato')
      setTimeout(() => {
        onClose()
      }, 1000)
    },
    onError: error => {
      const errorStr = String(error).toLowerCase()
      if (errorStr.includes('no-speech') || errorStr.includes('1110/no speech')) {
        return
      }
      console.error('[SHEET] Voice error:', error)
    },
  })

  const checkPermissions = async (): Promise<boolean> => {
    try {
      const audioPermission = await Audio.getPermissionsAsync()
      const audioGranted = audioPermission.status === 'granted'
      setHasPermissions(audioGranted)
      return audioGranted
    } catch (error) {
      console.error('[SHEET] Error checking permissions:', error)
      setHasPermissions(false)
      return false
    }
  }

  const requestPermissions = async () => {
    try {
      setIsRequestingPermissions(true)
      console.log('[SHEET] Requesting permissions...')

      const alreadyGranted = await checkPermissions()
      if (alreadyGranted) return true

      const { status, canAskAgain } = await Audio.requestPermissionsAsync()

      if (status !== 'granted') {
        if (!canAskAgain) {
          Alert.alert(
            t('atoAssistant.permissions.blockedTitle'),
            t('atoAssistant.permissions.blocked'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('atoAssistant.permissions.openSettings'),
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:')
                  } else {
                    Linking.openSettings()
                  }
                },
              },
            ]
          )
        } else {
          Alert.alert(
            t('atoAssistant.permissions.blockedTitle'),
            t('atoAssistant.permissions.needMic')
          )
        }
        setHasPermissions(false)
        return false
      }

      setHasPermissions(true)

      console.log('[SHEET] Permission granted, starting voice...')
      setTimeout(() => {
        if (isMountedRef.current && visible) {
          startListening().catch(err => {
            console.error('[SHEET] Start after permission error:', err)
          })
        }
      }, 300)

      return true
    } catch (error) {
      console.error('[SHEET] Permission error:', error)
      setHasPermissions(false)
      return false
    } finally {
      setIsRequestingPermissions(false)
    }
  }

  useEffect(() => {
    if (!visible) {
      hasAutoStartedRef.current = false
      setIsTextMode(false)

      if (autoResumeTimerRef.current) {
        clearTimeout(autoResumeTimerRef.current)
        autoResumeTimerRef.current = null
      }

      if (isListening) {
        stopListening().catch(err => console.error('[SHEET] Stop error:', err))
      }
      return
    }

    // Only run auto-start logic when modal FIRST opens
    if (hasAutoStartedRef.current) return

    const initVoice = async () => {
      if (!isMountedRef.current || hasAutoStartedRef.current) return

      try {
        const granted = await checkPermissions()
        if (!granted) return

        hasAutoStartedRef.current = true

        setTimeout(() => {
          if (isMountedRef.current && visible && !isListening) {
            console.log('[SHEET] Auto-starting voice')
            startListening().catch(err => {
              console.error('[SHEET] Auto-start error:', err)
              hasAutoStartedRef.current = false // Reset on error
            })
          }
        }, 300)
      } catch (error) {
        console.error('[SHEET] Init error:', error)
        hasAutoStartedRef.current = false
      }
    }

    initVoice()
  }, [visible])

  useEffect(() => {
    if (previousSpeakingRef.current && !isSpeaking && !isTextMode) {
      console.log('[SHEET] Ato finished speaking, scheduling auto-resume...')

      if (autoResumeTimerRef.current) {
        clearTimeout(autoResumeTimerRef.current)
      }

      autoResumeTimerRef.current = setTimeout(() => {
        if (
          isMountedRef.current &&
          visible &&
          !isListening &&
          !isProcessing &&
          hasPermissions &&
          !isTextMode
        ) {
          console.log('[SHEET] Auto-resuming listening...')
          startListening().catch(err => {
            console.error('[SHEET] Auto-resume error:', err)
          })
        }
      }, AUTO_RESUME_DELAY)
    }

    previousSpeakingRef.current = isSpeaking

    return () => {
      if (autoResumeTimerRef.current) {
        clearTimeout(autoResumeTimerRef.current)
        autoResumeTimerRef.current = null
      }
    }
  }, [isSpeaking, visible, isListening, isProcessing, hasPermissions, startListening, isTextMode])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (autoResumeTimerRef.current) {
        clearTimeout(autoResumeTimerRef.current)
      }
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current)
      }
    }
  }, [])

  // Show response when it changes and hide when user starts listening again
  useEffect(() => {
    if (response && response.trim()) {
      setShowingResponse(true)
    }
  }, [response])

  // Hide response when user starts listening (responding)
  useEffect(() => {
    if (isListening && showingResponse) {
      setShowingResponse(false)
    }
  }, [isListening, showingResponse])

  const handleSwitchToVoiceMode = async () => {
    console.log('[SHEET] Switching to voice mode')
    setIsTextMode(false)
    setInputText('')

    setTimeout(async () => {
      if (hasPermissions) {
        await startListening()
      }
    }, 300)
  }

  const handleSendMessage = async () => {
    if (inputText.trim()) {
      await sendTextMessage(inputText, { skipTTS: true })
      setInputText('')
    }
  }

  const handleInputFocus = () => {
    console.log('[SHEET] Switching to text mode')

    if (isListening) {
      stopListening().catch(err => console.error('[SHEET] Stop error:', err))
    }

    setIsTextMode(true)
  }

  const handleInputBlur = () => {
    if (!inputText.trim()) {
      setIsTextMode(false)
    }
  }

  const getStatusInfo = () => {
    if (isSpeaking) {
      return { text: t('atoAssistant.status.speaking'), icon: 'volume-high' as const }
    }
    if (isProcessing) {
      return { text: t('atoAssistant.status.processing'), icon: 'sync' as const }
    }
    if (isListening) {
      return { text: t('atoAssistant.status.listening'), icon: 'mic' as const }
    }
    return null
  }

  const getGreeting = () => {
    if (isLoadingUser) return t('atoAssistant.greeting.loading')
    if (!selectedUser) return t('atoAssistant.greeting.noUser')

    const name = selectedUser.nickname || selectedUser.name
    return t('atoAssistant.greeting.withUser', { name })
  }

  const statusInfo = getStatusInfo()
  const iconColor = '#3CCEF5'
  const badgeColor = isSpeaking
    ? '#10B981'
    : isProcessing
    ? '#8B5CF6'
    : isListening
    ? '#F59E0B'
    : '#3CCEF5'

  const getIconVariant = (): 'listening' | 'speaking' | 'idle' => {
    if (isListening) return 'listening'
    if (isSpeaking) return 'speaking'
    return 'idle'
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
        keyboardVerticalOffset={0}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
          disabled={isTextMode}
        >
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        </TouchableOpacity>

        <View style={[styles.sheetContainer, isTextMode && styles.sheetContainerExpanded]}>
          <View style={styles.handleBar} />

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>

          {isTextMode && <Text style={styles.modalTitle}>{getGreeting()}</Text>}

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {!isTextMode && (
              <>
                <Text style={styles.greeting}>{getGreeting()}</Text>

                {!hasPermissions && !isRequestingPermissions && (
                  <View style={styles.permissionWarning}>
                    <Ionicons name="warning" size={20} color="#F59E0B" />
                    <Text style={styles.permissionText}>
                      {t('atoAssistant.permissions.required')}
                    </Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
                      <Text style={styles.permissionButtonText}>{t('atoAssistant.permissions.givePermission')}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.voiceSection}>
                  <View style={styles.avatarContainer}>
                    <RippleAtoIcon
                      width={140}
                      height={140}
                      color={iconColor}
                      isActive={isListening || isSpeaking || isProcessing}
                      variant={getIconVariant()}
                    />
                  </View>

                  {statusInfo && (
                    <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}>
                      <Ionicons name={statusInfo.icon} size={16} color="white" />
                      <Text style={styles.statusText}>{statusInfo.text}</Text>
                    </View>
                  )}

                  {transcript && (isProcessing || !conversationHistory.some(msg => msg.content === transcript)) && (
                    <View style={styles.transcriptBox}>
                      <Text style={styles.transcriptLabel}>{t('atoAssistant.youSaid')}</Text>
                      <Text style={styles.transcriptText}>{transcript}</Text>
                    </View>
                  )}

                  {response && showingResponse && (
                    <View style={styles.responseBox}>
                      <Text style={styles.responseLabel}>{t('atoAssistant.atoResponds')}</Text>
                      <Text style={styles.responseText}>{response}</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {isTextMode && conversationHistory.length > 0 && (
              <View style={styles.chatContainer}>
                {conversationHistory.map((msg, idx) => (
                  <View
                    key={`${idx}-${msg.role}`}
                    style={[
                      styles.chatBubble,
                      msg.role === 'user' ? styles.chatUser : styles.chatAssistant,
                    ]}
                  >
                    <Text style={styles.chatRole}>{msg.role === 'user' ? '👤' : '🤖'}</Text>
                    <Text style={styles.chatContent}>{msg.content}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            {isTextMode && (
              <TouchableOpacity
                style={styles.micButton}
                onPress={handleSwitchToVoiceMode}
                activeOpacity={0.7}
              >
                <Ionicons name="mic" size={24} color="#3CCEF5" />
              </TouchableOpacity>
            )}

            <TextInput
              style={[
                styles.textInput,
                isTextMode && styles.textInputWithMic,
                !isTextMode && styles.voiceModeText,
              ]}
              value={inputText}
              onChangeText={setInputText}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={t('atoAssistant.inputPlaceholder')}
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={500}
              editable={!isProcessing && !isSpeaking}
            />

            {inputText.trim() && (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendMessage}
                disabled={isProcessing || isSpeaking}
              >
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: SCREEN_HEIGHT * 0.7,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetContainerExpanded: {
    height: SCREEN_HEIGHT * 0.8,
  },
  handleBar: {
    width: 50,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginTop: 56,
    marginBottom: 8,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 30,
    marginTop: 30,
  },
  voiceSection: {
    alignItems: 'center',
    width: '100%',
    minHeight: 400,
  },
  avatarContainer: {
    marginBottom: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  transcriptBox: {
    width: '100%',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 15,
    color: '#1E3A8A',
    lineHeight: 22,
  },
  responseBox: {
    width: '100%',
    backgroundColor: '#DBEAFE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 15,
    color: '#1E3A8A',
    lineHeight: 22,
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    position: 'relative',
  },
  voiceModeText: {
    paddingStart: 20,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingVertical: 16,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 50,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textInputWithMic: {
    paddingLeft: 52,
  },
  sendButton: {
    position: 'absolute',
    right: 28,
    top: 19,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3CCEF5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3CCEF5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  micButton: {
    position: 'absolute',
    left: 28,
    top: 19,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#3CCEF5',
  },
  permissionWarning: {
    width: '100%',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  permissionText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  chatContainer: {
    width: '100%',
    flex: 1,
  },
  chatBubble: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    maxWidth: '85%',
  },
  chatUser: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  chatAssistant: {
    backgroundColor: '#EFF6FF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  chatRole: {
    fontSize: 16,
    marginBottom: 4,
  },
  chatContent: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 21,
  },
})

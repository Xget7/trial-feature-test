import { useState, useEffect, useCallback, useRef } from 'react'
import * as voiceService from '../services/voiceService'
import { initTTS, speak, stop, addEventListener, cleanup } from '../services/tts/hybridTTSService'
import { callClaudeAgent, Message, ATO_SYSTEM_PROMPT } from '../services/aiAgent'
const ELEVEN_LABS_API_KEY = process.env.EXPO_PUBLIC_ELEVEN_LABS_API_KEY

interface UseVoiceAssistantOptions {
  language?: string
  systemPrompt?: string
  onError?: (error: Error) => void
  silenceTimeout?: number
  elderlyName?: string
  // ElevenLabs options
  elevenLabsApiKey?: string
  preferCloudTTS?: boolean
  useConversationalAI?: boolean
  voiceId?: string
}

interface VoiceAssistantState {
  isListening: boolean
  isSpeaking: boolean
  isProcessing: boolean
  transcript: string
  response: string
  conversationHistory: Message[]
  ttsProvider?: 'elevenlabs' | 'native'
}

// OPTIMIZED: Reduced from 3000ms to 1500ms for faster response
const DEFAULT_SILENCE_TIMEOUT = 1500

export const useVoiceAssistant = (options: UseVoiceAssistantOptions = {}) => {
  const {
    language = 'es-ES',
    systemPrompt = ATO_SYSTEM_PROMPT,
    onError,
    elevenLabsApiKey = ELEVEN_LABS_API_KEY,
    preferCloudTTS = true,
    useConversationalAI = true,
    elderlyName = 'the elderly person',
    voiceId = 'r3lotmx3BZETVvcKm6R6',
  } = options

  const [state, setState] = useState<VoiceAssistantState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    transcript: '',
    response: '',
    conversationHistory: [],
    ttsProvider: undefined,
  })

  const isMounted = useRef(true)
  const lastTranscriptRef = useRef<string>('')
  const lastProcessedTranscriptRef = useRef<string>('')
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isProcessingRef = useRef(false)
  const conversationHistoryRef = useRef<Message[]>([])
  const handlersSetupRef = useRef(false)
  const ttsInitializedRef = useRef(false)

  // Initialize TTS service once
  useEffect(() => {
    if (!ttsInitializedRef.current) {
      console.log('[TTS] 🚀 Initializing Hybrid TTS')

      const ttsConfig = elevenLabsApiKey
        ? {
            elevenLabsApiKey,
            preferCloudTTS,
            elevenLabsModel: 'eleven_multilingual_v2' as const,
          }
        : {
            preferCloudTTS: false,
          }

      const tts = initTTS(ttsConfig)
      ttsInitializedRef.current = true

      console.log('[TTS] ✅ TTS initialized')
    }
  }, [elevenLabsApiKey, preferCloudTTS])

  // Keep conversation history ref in sync
  useEffect(() => {
    conversationHistoryRef.current = state.conversationHistory
  }, [state.conversationHistory])

  // OPTIMIZED: Process speech immediately with aggressive timeout
  const handleSpeechResult = useCallback(
    async (spokenText: string) => {
      if (isProcessingRef.current || spokenText === lastProcessedTranscriptRef.current) {
        return
      }

      console.log('=== 🎯 PROCESSING:', spokenText)

      isProcessingRef.current = true
      lastProcessedTranscriptRef.current = spokenText

      // Clear any active silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }

      setState(prev => ({
        ...prev,
        transcript: spokenText,
        isProcessing: true,
        isListening: false,
      }))

      try {
        const newHistory: Message[] = [
          ...conversationHistoryRef.current,
          { role: 'user', content: spokenText },
        ]

        console.log('[AI] 🤖 Calling Claude...')
        const agentResponse = await callClaudeAgent(newHistory, {
          systemPrompt,
          elderlyName: elderlyName,
        })
        console.log('[AI] ✅ Response:', agentResponse.substring(0, 50) + '...')

        const updatedHistory: Message[] = [
          ...newHistory,
          { role: 'assistant', content: agentResponse },
        ]

        setState(prev => ({
          ...prev,
          conversationHistory: updatedHistory,
          response: agentResponse,
          isProcessing: false,
        }))

        const speakOptions = useConversationalAI
          ? {
              conversational: true,
              voiceId,
              optimizeStreamingLatency: 4,
            }
          : {
              model: 'eleven_turbo_v2_5' as const,
              voiceId,
              optimizeStreamingLatency: 3,
              language,
            }

        await speak(agentResponse, speakOptions)
        console.log('[TTS] ✅ Finished speaking')
      } catch (error) {
        console.error('=== ❌ ERROR ===', error)
        setState(prev => ({ ...prev, isProcessing: false }))

        const errorMessage = language.startsWith('es')
          ? 'Lo siento, hubo un error'
          : 'Sorry, there was an error'

        setState(prev => ({ ...prev, response: errorMessage }))

        try {
          await speak(errorMessage, {
            language,
            forceProvider: 'native',
          })
        } catch (ttsError) {
          console.error('[TTS ERROR]:', ttsError)
        }

        if (onError) onError(error as Error)
      } finally {
        isProcessingRef.current = false
      }
    },
    [systemPrompt, onError, language, useConversationalAI, voiceId, elderlyName]
  )

  // Setup handlers ONCE on mount
  useEffect(() => {
    if (handlersSetupRef.current) return

    console.log('[VOICE ASSISTANT] 🔧 Setting up handlers')

    voiceService.setLanguage(language)
    voiceService.setEventHandlers({
      onStart: () => {
        console.log('[VOICE] ✅ Started listening')
        if (isMounted.current) {
          setState(prev => ({ ...prev, isListening: true, transcript: '' }))
          lastTranscriptRef.current = ''
          lastProcessedTranscriptRef.current = ''
          isProcessingRef.current = false
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }
        }
      },

      onEnd: () => {
        console.log('[VOICE] ✅ Stopped listening')
        if (isMounted.current) {
          setState(prev => ({ ...prev, isListening: false }))
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }

          // OPTIMIZED: Only process if we have new content
          const trimmedTranscript = lastTranscriptRef.current.trim()
          if (
            trimmedTranscript &&
            trimmedTranscript !== lastProcessedTranscriptRef.current &&
            !isProcessingRef.current
          ) {
            console.log('[VOICE] 🚀 Processing final transcript')
            handleSpeechResult(trimmedTranscript)
          }
        }
      },

      onResults: results => {
        if (results && results[0] && isMounted.current) {
          const newResult = results[0].trim()

          // Ignore very short results (less than 3 characters)
          if (newResult.length < 3) {
            return
          }

          console.log('[VOICE] 📝 Result:', newResult)

          lastTranscriptRef.current = newResult
          setState(prev => ({
            ...prev,
            transcript: newResult,
            isListening: true,
          }))

          // OPTIMIZED: Reduced timer for faster processing
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
          }

          // Only start timer if we have substantial text (5+ chars)
          if (newResult.length >= 5) {
            console.log(`[VOICE] ⏱️ Starting ${DEFAULT_SILENCE_TIMEOUT}ms silence timer`)
            silenceTimerRef.current = setTimeout(async () => {
              console.log('[VOICE] ⏰ Silence timeout reached')
              const currentTranscript = lastTranscriptRef.current.trim()

              if (currentTranscript && currentTranscript !== lastProcessedTranscriptRef.current) {
                try {
                  console.log('[VOICE] 🛑 Auto-stopping listening')
                  await voiceService.stopListening()
                  console.log('[VOICE] 🚀 Processing on silence timeout')
                  handleSpeechResult(currentTranscript)
                } catch (error) {
                  console.error('[VOICE] ❌ Silence timeout error:', error)
                }
              } else {
                await voiceService.stopListening()
              }
            }, DEFAULT_SILENCE_TIMEOUT)
          }
        }
      },

      onVolumeChange: volume => {
        // Optional: Use for visual feedback
        if (volume !== undefined && volume > 30) {
          console.log('[VOICE] 🔊 Voice detected:', volume)
        }
      },

      onError: error => {
        console.error('[VOICE] ❌ Error:', error)
        if (isMounted.current) {
          setState(prev => ({ ...prev, isListening: false }))
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }
          isProcessingRef.current = false

          const errorStr = String(error).toLowerCase()
          if (
            errorStr.includes('no-speech') ||
            errorStr.includes('5/') ||
            errorStr.includes('7/')
          ) {
            console.log('[VOICE] ℹ️ No speech detected')
            return
          }

          if (onError) onError(new Error(`Voice recognition error: ${error}`))
        }
      },
    })

    handlersSetupRef.current = true
    console.log('[VOICE] ✅ Handlers configured')

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // TTS event handlers
  useEffect(() => {
    const removeStart = addEventListener('start', () => {
      console.log('[TTS] 🔊 Started speaking')
      if (isMounted.current) setState(prev => ({ ...prev, isSpeaking: true }))
    })

    const removeDone = addEventListener('done', () => {
      console.log('[TTS] ✅ Finished speaking')
      if (isMounted.current) setState(prev => ({ ...prev, isSpeaking: false }))
    })

    const removeStopped = addEventListener('stopped', () => {
      console.log('[TTS] 🛑 Stopped speaking')
      if (isMounted.current) setState(prev => ({ ...prev, isSpeaking: false }))
    })

    const removeError = addEventListener('error', () => {
      console.log('[TTS] ❌ TTS error')
      if (isMounted.current) {
        setState(prev => ({ ...prev, isSpeaking: false }))
        if (onError) onError(new Error('TTS error'))
      }
    })

    return () => {
      removeStart()
      removeDone()
      removeStopped()
      removeError()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[VOICE] 🧹 Cleanup')
      isMounted.current = false
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
      cleanup()
    }
  }, [])

  const startListening = useCallback(async () => {
    try {
      console.log('[VOICE] 🎤 Starting listening...')
      if (state.isSpeaking) await stop()

      isProcessingRef.current = false
      lastProcessedTranscriptRef.current = ''
      lastTranscriptRef.current = ''
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }

      await voiceService.startListening()
    } catch (error) {
      console.error('[VOICE] ❌ Start error:', error)
      if (onError) onError(error as Error)
    }
  }, [state.isSpeaking, onError])

  const stopListening = useCallback(async () => {
    try {
      console.log('[VOICE] 🛑 Stopping listening...')
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
      await voiceService.stopListening()
    } catch (error) {
      console.error('[VOICE] ❌ Stop error:', error)
      if (onError) onError(error as Error)
    }
  }, [onError])

  const stopSpeaking = useCallback(async () => {
    try {
      console.log('[VOICE] 🔇 Stopping speech...')
      await stop()
    } catch (error) {
      console.error('[VOICE] ❌ Error stopping TTS:', error)
      if (onError) onError(error as Error)
    }
  }, [onError])

  const clearConversation = useCallback(() => {
    setState(prev => ({
      ...prev,
      conversationHistory: [],
      transcript: '',
      response: '',
    }))
    lastTranscriptRef.current = ''
    lastProcessedTranscriptRef.current = ''
    console.log('[VOICE] 🗑️ Conversation cleared')
  }, [])

  const sendTextMessage = useCallback(
    async (text: string) => {
      if (text.trim()) {
        await handleSpeechResult(text.trim())
      }
    },
    [handleSpeechResult]
  )

  return {
    ...state,
    startListening,
    stopListening,
    stopSpeaking,
    clearConversation,
    sendTextMessage,
  }
}

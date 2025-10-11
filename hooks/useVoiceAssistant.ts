import { useState, useEffect, useCallback, useRef } from 'react'
import * as voiceService from '../services/voiceService'
import { initTTS, speak, stop, addEventListener, cleanup } from '../services/tts/hybridTTSService'
import { callClaudeAgent, Message, ATO_SYSTEM_PROMPT } from '../services/aiAgent'

interface UseVoiceAssistantOptions {
  language?: string
  systemPrompt?: string
  onError?: (error: Error) => void
  silenceTimeout?: number
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
  ttsProvider?: 'elevenlabs' | 'native' // Track which TTS is being used
}

const DEFAULT_SILENCE_TIMEOUT = 3000

export const useVoiceAssistant = (options: UseVoiceAssistantOptions = {}) => {
  const {
    language = 'es-ES',
    systemPrompt = ATO_SYSTEM_PROMPT,
    onError,
    silenceTimeout = DEFAULT_SILENCE_TIMEOUT,
    elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY,
    preferCloudTTS = true,
    useConversationalAI = true,
    voiceId = '21m00Tcm4TlvDq8ikWAM', // Default: Rachel voice
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
      console.log('[TTS] 🚀 Initializing Hybrid TTS with V3 Turbo')

      const ttsConfig = elevenLabsApiKey
        ? {
            elevenLabsApiKey,
            preferCloudTTS,
            elevenLabsModel: 'eleven_turbo_v2_5' as const, // V3 Turbo
          }
        : {
            preferCloudTTS: false, // Use native only if no API key
          }

      const tts = initTTS(ttsConfig)
      ttsInitializedRef.current = true

      console.log('[TTS] ✅ TTS initialized', {
        hasApiKey: !!elevenLabsApiKey,
        preferCloud: preferCloudTTS,
      })
    }
  }, [elevenLabsApiKey, preferCloudTTS])

  // Keep conversation history ref in sync
  useEffect(() => {
    conversationHistoryRef.current = state.conversationHistory
  }, [state.conversationHistory])

  // Process speech function with enhanced TTS
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
        console.log('[VOICE ASSISTANT] ⏱️ Cleared timer during processing')
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
        const agentResponse = await callClaudeAgent(newHistory, systemPrompt)
        console.log('[AI] ✅ Response:', agentResponse)

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

        // Speak with conversational AI using V3 Turbo
        console.log('[TTS] 🔊 Speaking with V3 Turbo...')

        const speakOptions = useConversationalAI
          ? {
              conversational: true, // Use conversational AI mode
              voiceId,
              optimizeStreamingLatency: 4, // Maximum speed for real-time
            }
          : {
              model: 'eleven_turbo_v2_5' as const,
              voiceId,
              optimizeStreamingLatency: 3,
              language, // Fallback for native TTS
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
            language, // Use native TTS for errors
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
    [systemPrompt, onError, language, useConversationalAI, voiceId]
  )

  // Setup handlers ONCE on mount
  useEffect(() => {
    if (handlersSetupRef.current) return

    console.log('[VOICE ASSISTANT] 🔧 Setting up handlers ONCE')

    voiceService.setLanguage(language)
    voiceService.setEventHandlers({
      onStart: () => {
        console.log('[VOICE ASSISTANT] ✅ onStart')
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
        console.log('[VOICE ASSISTANT] ✅ onEnd')
        if (isMounted.current) {
          setState(prev => ({ ...prev, isListening: false }))
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }

          const trimmedTranscript = lastTranscriptRef.current.trim()
          if (
            trimmedTranscript &&
            trimmedTranscript !== lastProcessedTranscriptRef.current &&
            !isProcessingRef.current
          ) {
            console.log('[VOICE ASSISTANT] 🚀 Processing from onEnd')
            handleSpeechResult(trimmedTranscript)
          }
        }
      },

      onResults: results => {
        if (results && results[0] && isMounted.current) {
          const newResult = results[0].trim()
          console.log('[VOICE ASSISTANT] 📝 Result:', newResult)

          lastTranscriptRef.current = newResult
          setState(prev => ({
            ...prev,
            transcript: newResult,
            isListening: true,
          }))

          // Start silence timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            console.log('[VOICE ASSISTANT] ⏱️ Cleared previous timer')
          }

          console.log(`[VOICE ASSISTANT] ⏱️ Starting ${DEFAULT_SILENCE_TIMEOUT}ms timer`)
          silenceTimerRef.current = setTimeout(async () => {
            console.log('[VOICE ASSISTANT] ⏰ SILENCE TIMEOUT REACHED!')
            const currentTranscript = lastTranscriptRef.current.trim()
            console.log('[VOICE ASSISTANT] Current transcript:', currentTranscript)
            console.log('[VOICE ASSISTANT] Last processed:', lastProcessedTranscriptRef.current)

            if (currentTranscript && currentTranscript !== lastProcessedTranscriptRef.current) {
              try {
                console.log('[VOICE ASSISTANT] 🛑 Auto-stopping listening...')
                await voiceService.stopListening()
                console.log('[VOICE ASSISTANT] 🚀 Processing transcript')
                handleSpeechResult(currentTranscript)
              } catch (error) {
                console.error('[VOICE ASSISTANT] ❌ Silence error:', error)
              }
            } else {
              console.log('[VOICE ASSISTANT] No new transcript, just stopping')
              await voiceService.stopListening()
            }
          }, DEFAULT_SILENCE_TIMEOUT)

          console.log('[VOICE ASSISTANT] ✅ Timer started')
        }
      },

      onVolumeChange: volume => {
        // Volume monitoring for debugging
        if (volume !== undefined && volume > 30) {
          console.log('[VOICE ASSISTANT] 🔊 Voice detected:', volume)
        }
      },

      onError: error => {
        console.error('[VOICE ASSISTANT] ❌ Error:', error)
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
            console.log('[VOICE ASSISTANT] ℹ️ No speech detected')
            return
          }

          if (onError) onError(new Error(`Voice recognition error: ${error}`))
        }
      },
    })

    handlersSetupRef.current = true
    console.log('[VOICE ASSISTANT] ✅ Handlers configured permanently')

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // EMPTY dependencies - only run once!

  // TTS event handlers - setup once
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
  }, []) // Empty - setup once

  // Cleanup ONLY on unmount
  useEffect(() => {
    return () => {
      console.log('[VOICE ASSISTANT] 🧹 REAL UNMOUNT - cleanup')
      isMounted.current = false
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
      cleanup()
    }
  }, []) // EMPTY - only on unmount!

  const startListening = useCallback(async () => {
    try {
      console.log('[VOICE ASSISTANT] 🎤 Starting...')
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
      console.error('[VOICE ASSISTANT] ❌ Start error:', error)
      if (onError) onError(error as Error)
    }
  }, [state.isSpeaking, onError])

  const stopListening = useCallback(async () => {
    try {
      console.log('[VOICE ASSISTANT] 🛑 Stopping...')
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
      await voiceService.stopListening()
    } catch (error) {
      console.error('[VOICE ASSISTANT] ❌ Stop error:', error)
      if (onError) onError(error as Error)
    }
  }, [onError])

  const stopSpeaking = useCallback(async () => {
    try {
      console.log('[VOICE ASSISTANT] 🔇 Stopping speech...')
      await stop()
    } catch (error) {
      console.error('Error stopping TTS:', error)
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
    console.log('[VOICE ASSISTANT] 🗑️ Conversation cleared')
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

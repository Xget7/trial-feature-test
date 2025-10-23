import { useState, useEffect, useCallback, useRef } from 'react'
import * as voiceService from '../services/voiceService'
import { initTTS, speak, stop, addEventListener, cleanup } from '../services/tts/hybridTTSService'
import { callClaudeAgent, Message, ATO_SYSTEM_PROMPT, ClaudeModel, DEFAULT_MODEL } from '../services/claudeAgent'
import { PerformanceAnalytics, TimingMetric } from '@/types/analytics.types'


const ELEVEN_LABS_API_KEY = process.env.EXPO_PUBLIC_ELEVEN_LABS_API_KEY

interface UseVoiceAssistantOptions {
  language?: string
  systemPrompt?: string
  onError?: (error: Error) => void
  silenceTimeout?: number
  elderlyName?: string
  managerId?: string
  elevenLabsApiKey?: string
  preferCloudTTS?: boolean
  useConversationalAI?: boolean
  voiceId?: string
  onConversationEnd?: () => void
  onAnalytics?: (analytics: PerformanceAnalytics) => void  // NEW: Callback for analytics
  claudeModel?: ClaudeModel  // NEW: Allow model selection
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

// OPTIMIZED: Reduced from 1500ms to 800ms
const DEFAULT_SILENCE_TIMEOUT = 800

// Helper to create timing metric
const startTiming = (): TimingMetric => ({
  startTime: Date.now(),
})

const endTiming = (metric: TimingMetric): TimingMetric => {
  const endTime = Date.now()
  return {
    ...metric,
    endTime,
    duration: endTime - metric.startTime,
  }
}

// Generate unique session ID
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export const useVoiceAssistant = (options: UseVoiceAssistantOptions = {}) => {
  const {
    language = 'es-ES',
    systemPrompt = ATO_SYSTEM_PROMPT,
    onError,
    elevenLabsApiKey = ELEVEN_LABS_API_KEY,
    preferCloudTTS = true,
    useConversationalAI = true,
    elderlyName = 'the elderly person',
    managerId,
    voiceId = 'r3lotmx3BZETVvcKm6R6',
    onConversationEnd,
    onAnalytics,
    claudeModel = DEFAULT_MODEL,  
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
  const isTextModeRef = useRef(false)
  const isStartingRef = useRef(false)

  // Analytics refs
  const currentAnalyticsRef = useRef<PerformanceAnalytics | null>(null)

  // Initialize analytics for a new interaction
  const initAnalytics = useCallback(() => {
    currentAnalyticsRef.current = {
      sessionId: generateSessionId(),
      timestamp: Date.now(),
      stages: {
        voiceRecognition: startTiming(),
        claudeProcessing: { startTime: 0 },
        ttsGeneration: { startTime: 0 },
        totalEndToEnd: startTiming(),
      },
      metadata: {
        transcriptLength: 0,
        responseLength: 0,
        hadError: false,
      },
    }
    console.log('┌─────────────────────────────────────────────────────────────────┐')
    console.log('│ PERFORMANCE ANALYTICS STARTED                                  │')
    console.log(`│ Session ID: ${currentAnalyticsRef.current.sessionId.padEnd(45)}│`)
    console.log('└─────────────────────────────────────────────────────────────────┘')
  }, [])

  // Finalize and report analytics
  const finalizeAnalytics = useCallback(
    (hadError: boolean = false) => {
      if (!currentAnalyticsRef.current) return

      const analytics = currentAnalyticsRef.current
      analytics.metadata.hadError = hadError

      // Calculate total end-to-end
      analytics.stages.totalEndToEnd = endTiming(analytics.stages.totalEndToEnd)

      // Log detailed analytics
      console.log('┌─────────────────────────────────────────────────────────────────┐')
      console.log('│ PERFORMANCE ANALYTICS COMPLETE                                 │')
      console.log('├─────────────────────────────────────────────────────────────────┤')
      console.log(`│ Session: ${analytics.sessionId.padEnd(49)}│`)
      console.log('├─────────────────────────────────────────────────────────────────┤')
      console.log('│ TIMING BREAKDOWN:                                              │')
      console.log(
        `│   Voice Recognition: ${String(
          analytics.stages.voiceRecognition.duration || 'N/A'
        ).padEnd(40)}ms │`
      )
      console.log(
        `│   Claude Processing: ${String(
          analytics.stages.claudeProcessing.duration || 'N/A'
        ).padEnd(40)}ms │`
      )
      console.log(
        `│   TTS Generation:    ${String(
          analytics.stages.ttsGeneration.duration || 'N/A'
        ).padEnd(43)}ms │`
      )
      console.log(
        `│   Total End-to-End: ${String(
          analytics.stages.totalEndToEnd.duration || 'N/A'
        ).padEnd(42)}ms │`
      )
      console.log('├─────────────────────────────────────────────────────────────────┤')
      console.log('│ METADATA:                                                      │')
      console.log(
        `│   Transcript Length: ${String(analytics.metadata.transcriptLength).padEnd(41)} │`
      )
      console.log(
        `│   Response Length:   ${String(analytics.metadata.responseLength).padEnd(41)} │`
      )
      console.log(
        `│   TTS Provider:      ${String(
          analytics.metadata.ttsProvider || 'N/A'
        ).padEnd(41)} │`
      )
      console.log(
        `│   Tools Used:        ${String(
          analytics.metadata.toolsUsed?.join(', ') || 'None'
        ).padEnd(41)} │`
      )
      console.log(
        `│   Had Error:         ${String(analytics.metadata.hadError).padEnd(41)} │`
      )
      console.log('└─────────────────────────────────────────────────────────────────┘')

      // Call analytics callback if provided
      if (onAnalytics) {
        onAnalytics(analytics)
      }

      // Reset for next interaction
      currentAnalyticsRef.current = null
    },
    [onAnalytics]
  )

  useEffect(() => {
    if (!ttsInitializedRef.current) {
      console.log('[TTS] Initializing Hybrid TTS')

      const ttsConfig = elevenLabsApiKey
        ? {
            elevenLabsApiKey,
            preferCloudTTS,
            elevenLabsModel: 'eleven_turbo_v2_5' as const,  
          }
        : {
            preferCloudTTS: false,
          }

      const tts = initTTS(ttsConfig)
      ttsInitializedRef.current = true

      console.log('[TTS] TTS initialized with turbo model')
    }
  }, [elevenLabsApiKey, preferCloudTTS])

  useEffect(() => {
    conversationHistoryRef.current = state.conversationHistory
  }, [state.conversationHistory])

  const handleSpeechResult = useCallback(
    async (spokenText: string, skipTTS: boolean = false) => {
      if (isProcessingRef.current || spokenText === lastProcessedTranscriptRef.current) {
        return
      }

      console.log(
        '=== PROCESSING:',
        spokenText,
        skipTTS ? '(TEXT MODE - NO TTS)' : '(VOICE MODE)'
      )

      isProcessingRef.current = true
      lastProcessedTranscriptRef.current = spokenText

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }

      // End voice recognition timing
      if (currentAnalyticsRef.current) {
        currentAnalyticsRef.current.stages.voiceRecognition = endTiming(
          currentAnalyticsRef.current.stages.voiceRecognition
        )
        currentAnalyticsRef.current.metadata.transcriptLength = spokenText.length
        console.log(
          `[ANALYTICS] Voice Recognition: ${currentAnalyticsRef.current.stages.voiceRecognition.duration}ms`
        )
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

        console.log('[AI] Calling Claude...')

        // Start Claude processing timing
        if (currentAnalyticsRef.current) {
          currentAnalyticsRef.current.stages.claudeProcessing = startTiming()
        }

        // OPTIMIZATION: Call Claude with tool callback for immediate loading message
        const agentResult = await callClaudeAgent(newHistory, {
          systemPrompt,
          elderlyName: elderlyName,
          managerId: managerId,
          model: claudeModel,  // Use configurable model
          onToolStart: async (toolName, loadingMessage) => {
            if (loadingMessage && !skipTTS) {
              console.log(`[LOADING] Speaking: "${loadingMessage}"`)
              try {
                await speak(loadingMessage, {
                  model: 'eleven_turbo_v2_5' as const,
                  optimizeStreamingLatency: 4,  // Maximum speed
                  voiceId,
                })
              } catch (error) {
                console.error('[LOADING] Error speaking loading message:', error)
              }
            }
          }
        })

        // End Claude processing timing
        if (currentAnalyticsRef.current) {
          currentAnalyticsRef.current.stages.claudeProcessing = endTiming(
            currentAnalyticsRef.current.stages.claudeProcessing
          )
          currentAnalyticsRef.current.metadata.responseLength = agentResult.response.length
          currentAnalyticsRef.current.metadata.toolsUsed = agentResult.toolsUsed
          console.log(
            `[ANALYTICS] Claude Processing: ${currentAnalyticsRef.current.stages.claudeProcessing.duration}ms`
          )
        }

        const agentResponse = agentResult.response
        console.log('[AI] Response:', agentResponse.substring(0, 50) + '...')

        if (agentResult.toolsUsed) {
          console.log('[AI] Tools used:', agentResult.toolsUsed.join(', '))
        }

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

        if (!skipTTS) {
          console.log('[TTS] Playing audio response')

          // Start TTS timing
          if (currentAnalyticsRef.current) {
            currentAnalyticsRef.current.stages.ttsGeneration = startTiming()
            currentAnalyticsRef.current.metadata.ttsProvider = preferCloudTTS
              ? 'elevenlabs'
              : 'native'
          }

          // OPTIMIZED: Always use turbo model with max latency optimization
          const speakOptions = {
            model: 'eleven_turbo_v2_5' as const,
            voiceId,
            optimizeStreamingLatency: 4,  // Maximum speed
            language,
          }

          await speak(agentResponse, speakOptions)

          // End TTS timing
          if (currentAnalyticsRef.current) {
            currentAnalyticsRef.current.stages.ttsGeneration = endTiming(
              currentAnalyticsRef.current.stages.ttsGeneration
            )
            console.log(
              `[ANALYTICS] TTS Generation: ${currentAnalyticsRef.current.stages.ttsGeneration.duration}ms`
            )
          }

          console.log('[TTS] Finished speaking')

          // Finalize analytics
          finalizeAnalytics(false)

          if (agentResult.shouldEndConversation) {
            console.log('[AI] Conversation should end')
            if (onConversationEnd) {
              setTimeout(() => {
                onConversationEnd()
              }, 1000)
            }
          }
        } else {
          console.log('[TTS] Skipping audio (text mode)')

          // Finalize analytics even without TTS
          finalizeAnalytics(false)

          if (agentResult.shouldEndConversation && onConversationEnd) {
            console.log('[AI] Conversation should end (text mode)')
            setTimeout(() => {
              onConversationEnd()
            }, 500)
          }
        }
      } catch (error) {
        console.error('=== ERROR ===', error)

        // Finalize analytics with error flag
        finalizeAnalytics(true)

        setState(prev => ({ ...prev, isProcessing: false }))

        const errorMessage = language.startsWith('es')
          ? 'Lo siento, hubo un error'
          : 'Sorry, there was an error'

        setState(prev => ({ ...prev, response: errorMessage }))

        if (!skipTTS) {
          try {
            await speak(errorMessage, {
              language,
              forceProvider: 'native',
            })
          } catch (ttsError) {
            console.error('[TTS ERROR]:', ttsError)
          }
        }

        if (onError) onError(error as Error)
      } finally {
        isProcessingRef.current = false
        isTextModeRef.current = false
      }
    },
    [
      systemPrompt,
      onError,
      language,
      useConversationalAI,
      voiceId,
      elderlyName,
      managerId,
      onConversationEnd,
      preferCloudTTS,
      finalizeAnalytics,
      claudeModel,
    ]
  )

  useEffect(() => {
    const initializeVoiceModule = async () => {
      try {
        console.log('[VOICE ASSISTANT] Initializing Voice module')

        const initialized = await voiceService.initializeVoice()

        if (!initialized) {
          console.error('[VOICE ASSISTANT] Voice module not available')
          const error = new Error('Speech recognition not available on this device')
          if (onError) {
            onError(error)
          }
          return
        }

        console.log('[VOICE ASSISTANT] Voice module ready')
      } catch (error) {
        console.error('[VOICE ASSISTANT] Failed to initialize Voice:', error)
        if (onError) {
          onError(error as Error)
        }
      }
    }

    initializeVoiceModule()
  }, [onError])

  useEffect(() => {
    if (handlersSetupRef.current) return

    console.log('[VOICE ASSISTANT] Setting up handlers')

    voiceService.setLanguage(language)
    voiceService.setEventHandlers({
      onStart: () => {
        console.log('[VOICE] Started listening')
        isStartingRef.current = false

        // Initialize analytics when voice starts
        if (!isTextModeRef.current) {
          initAnalytics()
        }

        if (isMounted.current && !isTextModeRef.current) {
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
        console.log('[VOICE] Stopped listening')
        isStartingRef.current = false
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
            !isProcessingRef.current &&
            !isTextModeRef.current
          ) {
            console.log('[VOICE] Processing final transcript')
            handleSpeechResult(trimmedTranscript, false)
          }
        }
      },

      onResults: results => {
        if (results && results[0] && isMounted.current && !isTextModeRef.current) {
          const newResult = results[0].trim()

          if (newResult.length < 3) {
            return
          }

          console.log('[VOICE] Result:', newResult)

          lastTranscriptRef.current = newResult
          setState(prev => ({
            ...prev,
            transcript: newResult,
            isListening: true,
          }))

          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
          }

          if (newResult.length >= 5) {
            console.log(`[VOICE] Starting ${DEFAULT_SILENCE_TIMEOUT}ms silence timer`)
            silenceTimerRef.current = setTimeout(async () => {
              console.log('[VOICE] Silence timeout reached')
              const currentTranscript = lastTranscriptRef.current.trim()

              if (currentTranscript && currentTranscript !== lastProcessedTranscriptRef.current) {
                try {
                  console.log('[VOICE] Auto-stopping listening')
                  await voiceService.stopListening()
                  console.log('[VOICE] Processing on silence timeout')
                  handleSpeechResult(currentTranscript, false)
                } catch (error) {
                  console.error('[VOICE] Silence timeout error:', error)
                }
              } else {
                await voiceService.stopListening()
              }
            }, DEFAULT_SILENCE_TIMEOUT)
          }
        }
      },

      onVolumeChange: volume => {
        if (volume !== undefined && volume > 30) {
          console.log('[VOICE] Voice detected:', volume)
        }
      },

      onError: error => {
        console.error('[VOICE] Error:', error)
        isStartingRef.current = false

        // Finalize analytics on error
        if (currentAnalyticsRef.current) {
          finalizeAnalytics(true)
        }

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
            console.log('[VOICE] No speech detected')
            return
          }

          if (errorStr.includes('already started')) {
            console.log('[VOICE] Recognition already active, ignoring')
            return
          }

          if (onError) onError(new Error(`Voice recognition error: ${error}`))
        }
      },
    })

    handlersSetupRef.current = true
    console.log('[VOICE] Handlers configured')
  }, [initAnalytics, finalizeAnalytics])

  useEffect(() => {
    const removeStart = addEventListener('start', () => {
      console.log('[TTS] Started speaking')
      if (isMounted.current) setState(prev => ({ ...prev, isSpeaking: true }))
    })

    const removeDone = addEventListener('done', () => {
      console.log('[TTS] Finished speaking')
      if (isMounted.current) setState(prev => ({ ...prev, isSpeaking: false }))
    })

    const removeStopped = addEventListener('stopped', () => {
      console.log('[TTS] Stopped speaking')
      if (isMounted.current) setState(prev => ({ ...prev, isSpeaking: false }))
    })

    const removeError = addEventListener('error', () => {
      console.log('[TTS] TTS error')
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
  }, [])

  useEffect(() => {
    return () => {
      console.log('[VOICE] Cleanup')
      isMounted.current = false
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
      voiceService.cleanup()
    }
  }, [])

  const startListening = useCallback(async () => {
    if (isStartingRef.current) {
      console.log('[VOICE] Already starting, skipping...')
      return
    }

    if (state.isListening) {
      console.log('[VOICE] Already listening, skipping...')
      return
    }

    try {
      isStartingRef.current = true
      console.log('[VOICE] Starting listening...')

      if (state.isSpeaking) {
        console.log('[VOICE] Stopping TTS first...')
        await stop()
        await new Promise(resolve => setTimeout(resolve, 50))  // Reduced from 100ms
      }

      isProcessingRef.current = false
      isTextModeRef.current = false
      lastProcessedTranscriptRef.current = ''
      lastTranscriptRef.current = ''
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }

      await voiceService.startListening()
    } catch (error) {
      console.error('[VOICE] Start error:', error)
      isStartingRef.current = false

      const errorStr = String(error).toLowerCase()
      if (!errorStr.includes('already started') && onError) {
        onError(error as Error)
      }
    }
  }, [state.isSpeaking, state.isListening, onError])

  const stopListening = useCallback(async () => {
    try {
      console.log('[VOICE] Stopping listening...')
      isStartingRef.current = false
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
      await voiceService.stopListening()
    } catch (error) {
      console.error('[VOICE] Stop error:', error)
      if (onError) onError(error as Error)
    }
  }, [onError])

  const stopSpeaking = useCallback(async () => {
    try {
      console.log('[VOICE] Stopping speech...')
      await stop()
    } catch (error) {
      console.error('[VOICE] Error stopping TTS:', error)
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
    console.log('[VOICE] Conversation cleared')
  }, [])

  const sendTextMessage = useCallback(
    async (text: string, options?: { skipTTS?: boolean }) => {
      if (text.trim()) {
        isTextModeRef.current = true

        // Initialize analytics for text mode
        initAnalytics()

        if (state.isListening) {
          console.log('[VOICE] Stopping listening for text mode')
          await stopListening()
        }

        await handleSpeechResult(text.trim(), options?.skipTTS ?? false)
      }
    },
    [handleSpeechResult, state.isListening, stopListening, initAnalytics]
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

export type { PerformanceAnalytics }

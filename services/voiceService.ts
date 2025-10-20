import { Platform } from 'react-native'
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition'

export type VoiceEventType = 'start' | 'end' | 'results' | 'error' | 'volumeChange'

export interface VoiceEventHandlers {
  onStart?: () => void
  onEnd?: () => void
  onResults?: (results: string[]) => void
  onError?: (error: any) => void
  onVolumeChange?: (volume: number) => void
}

// Internal state
let isListening = false
let isVoiceInitialized = false
let language = 'es-ES'
const eventHandlers: VoiceEventHandlers = {}
let lastResults: string[] = []
let hasReceivedResults = false
let listeners: any[] = []

/**
 * Setup Voice recognition event listeners
 */
const setupVoiceListeners = (): void => {
  console.log('[VOICE SERVICE] Setting up listeners')

  // Remove old listeners
  listeners.forEach(listener => listener.remove())
  listeners = []

  // Start event
  listeners.push(
    ExpoSpeechRecognitionModule.addListener('start', () => {
      console.log('=== SPEECH RECOGNITION STARTED ===')
      console.log('[LANGUAGE]:', language)
      console.log('[PLATFORM]:', Platform.OS)

      isListening = true
      hasReceivedResults = false
      lastResults = []

      if (eventHandlers.onStart) {
        eventHandlers.onStart()
      }
    })
  )

  // End event
  listeners.push(
    ExpoSpeechRecognitionModule.addListener('end', () => {
      console.log('=== SPEECH RECOGNITION ENDED ===')
      console.log('[HAS_RECEIVED_RESULTS]:', hasReceivedResults)
      console.log('[LAST_RESULTS]:', lastResults)

      isListening = false

      // If we have results but haven't dispatched them, do it now
      if (!hasReceivedResults && lastResults.length > 0) {
        console.log('[FIX]: Dispatching results from onEnd')
        if (eventHandlers.onResults) {
          eventHandlers.onResults(lastResults)
        }
      }

      if (eventHandlers.onEnd) {
        eventHandlers.onEnd()
      }

      // Reset flags
      hasReceivedResults = false
      lastResults = []
    })
  )

  // Result event
  listeners.push(
    ExpoSpeechRecognitionModule.addListener('result', event => {
      console.log('=== SPEECH RESULTS ===')
      console.log('[PLATFORM]:', Platform.OS)
      console.log('[IS_FINAL]:', event.isFinal)
      console.log('[RESULTS]:', event.results)

      if (event.results && event.results.length > 0) {
        const transcripts = event.results.map((r: any) => r.transcript)
        console.log('[TRANSCRIPTS]:', transcripts)

        // Save results
        lastResults = transcripts

        // Only dispatch on final results
        if (event.isFinal) {
          console.log('[FINAL RESULT]:', transcripts[0])
          hasReceivedResults = true

          if (eventHandlers.onResults) {
            eventHandlers.onResults(transcripts)
          }
        }
      }
    })
  )

  // Error event
  listeners.push(
    ExpoSpeechRecognitionModule.addListener('error', event => {
      console.error('=== SPEECH ERROR ===')
      console.error('[PLATFORM]:', Platform.OS)
      console.error('[ERROR]:', event.error)
      console.error('[MESSAGE]:', event.message)

      isListening = false
      hasReceivedResults = false

      if (eventHandlers.onError) {
        eventHandlers.onError(event.error)
      }
    })
  )

  // Volume change event (optional)
  listeners.push(
    ExpoSpeechRecognitionModule.addListener('volumechange', event => {
      if (eventHandlers.onVolumeChange && event.value !== undefined) {
        eventHandlers.onVolumeChange(event.value)
      }
    })
  )

  console.log('[VOICE SERVICE] Listeners configured')
}

/**
 * Initialize Voice module
 */
export const initializeVoice = async (): Promise<boolean> => {
  try {
    console.log('[VOICE SERVICE] 🚀 Initializing Expo Speech Recognition...')
    console.log('[VOICE SERVICE] Platform:', Platform.OS)

    // Check if speech recognition is available
    const available = ExpoSpeechRecognitionModule.isRecognitionAvailable()
    console.log('[VOICE SERVICE] Recognition available:', available)

    if (!available) {
      console.error('[VOICE SERVICE] ❌ Speech recognition not available')
      isVoiceInitialized = false
      return false
    }

    // Request permissions
    const { granted, status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    console.log('[VOICE SERVICE] Permission status:', status, 'granted:', granted)

    if (!granted) {
      console.error('[VOICE SERVICE] ❌ Permission denied')
      isVoiceInitialized = false
      return false
    }

    // Check available services on Android
    if (Platform.OS === 'android') {
      try {
        const services = ExpoSpeechRecognitionModule.getSpeechRecognitionServices()
        console.log('[VOICE SERVICE] Available services:', services)

        if (services.length === 0) {
          console.error('[VOICE SERVICE] ❌ No speech recognition services available')
          isVoiceInitialized = false
          return false
        }
      } catch (e) {
        console.log('[VOICE SERVICE] Could not get services (this is okay)')
      }
    }

    // Setup event listeners
    setupVoiceListeners()

    isVoiceInitialized = true
    console.log('[VOICE SERVICE] ✅ Speech Recognition initialized successfully')
    return true
  } catch (error) {
    console.error('[VOICE SERVICE] ❌ Failed to initialize:', error)
    isVoiceInitialized = false
    return false
  }
}

/**
 * Check if Voice is initialized
 */
export const isInitialized = (): boolean => {
  return isVoiceInitialized
}

/**
 * Start voice recognition
 */
export const startListening = async (lang?: string): Promise<void> => {
  try {
    // Initialize if not already done
    if (!isVoiceInitialized) {
      console.log('[VOICE SERVICE] Not initialized, initializing now...')
      const initialized = await initializeVoice()

      if (!initialized) {
        throw new Error('Voice module could not be initialized')
      }

      await new Promise(resolve => setTimeout(resolve, 300))
    }

    if (isListening) {
      console.log('[VOICE SERVICE] Already listening, stopping first...')
      await stopListening()
      await new Promise(resolve => setTimeout(resolve, 150))
    }

    const selectedLang = lang || language
    console.log('[VOICE SERVICE] Starting recognition with language:', selectedLang)

    // Start recognition
    ExpoSpeechRecognitionModule.start({
      lang: selectedLang,
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
      requiresOnDeviceRecognition: false,
      addsPunctuation: false,
      contextualStrings: [],
      // Android-specific options
      ...(Platform.OS === 'android' && {
        androidIntentOptions: {
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 3500,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2500,
          EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 2000,
        },
      }),
    })

    console.log('[VOICE SERVICE] ✅ Recognition started')
  } catch (error) {
    console.error('[VOICE SERVICE ERROR] Error starting:', error)
    isListening = false
    hasReceivedResults = false
    throw error
  }
}

/**
 * Stop voice recognition
 */
export const stopListening = async (): Promise<void> => {
  try {
    console.log('[VOICE SERVICE] Stopping recognition...')
    console.log('[VOICE SERVICE] Current state - isListening:', isListening)
    console.log('[VOICE SERVICE] Current state - hasResults:', hasReceivedResults)

    ExpoSpeechRecognitionModule.stop()
    console.log('[VOICE SERVICE] Stop called successfully')

    // iOS may need a small delay
    if (Platform.OS === 'ios') {
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  } catch (error) {
    console.error('[VOICE SERVICE ERROR] Error stopping:', error)
    isListening = false
    throw error
  }
}

/**
 * Cancel voice recognition
 */
export const cancelListening = async (): Promise<void> => {
  try {
    console.log('[VOICE SERVICE] Cancelling recognition...')
    ExpoSpeechRecognitionModule.abort()
    isListening = false
    hasReceivedResults = false
    lastResults = []
    console.log('[VOICE SERVICE] Recognition cancelled')
  } catch (error) {
    console.error('[VOICE SERVICE ERROR] Error cancelling:', error)
    throw error
  }
}

/**
 * Check if currently listening
 */
export const getIsListening = (): boolean => {
  return isListening
}

/**
 * Set default language
 */
export const setLanguage = (lang: string): void => {
  language = lang
  console.log('[VOICE SERVICE] Language set to:', lang)
}

/**
 * Get current language
 */
export const getLanguage = (): string => {
  return language
}

/**
 * Set event handlers
 */
export const setEventHandlers = (handlers: VoiceEventHandlers): void => {
  console.log('[VOICE SERVICE] Setting event handlers:', Object.keys(handlers))

  // Clear existing handlers
  Object.keys(eventHandlers).forEach(key => {
    delete (eventHandlers as any)[key]
  })
  Object.assign(eventHandlers, handlers)

  console.log('[VOICE SERVICE] Event handlers configured')

  // Re-setup listeners with new handlers
  setupVoiceListeners()
}

/**
 * Check if speech recognition is available
 */
export const isAvailable = async (): Promise<boolean> => {
  try {
    const available = ExpoSpeechRecognitionModule.isRecognitionAvailable()
    console.log('[VOICE SERVICE] Speech recognition available:', available)
    return available
  } catch (error) {
    console.error('[VOICE SERVICE ERROR] Error checking availability:', error)
    return false
  }
}

/**
 * Get supported locales (Android only)
 */
export const getSupportedLanguages = async (): Promise<string[]> => {
  try {
    if (Platform.OS !== 'android') {
      return []
    }

    const { locales } = await ExpoSpeechRecognitionModule.getSupportedLocales({})
    console.log('[VOICE SERVICE] Supported locales:', locales)
    return locales
  } catch (error) {
    console.error('[VOICE SERVICE ERROR] Error getting locales:', error)
    return []
  }
}

/**
 * Clean up voice recognition resources
 */
export const cleanup = async (): Promise<void> => {
  try {
    console.log('[VOICE SERVICE] Cleaning up...')

    // Remove all listeners
    listeners.forEach(listener => listener.remove())
    listeners = []

    // Abort if listening
    if (isListening) {
      ExpoSpeechRecognitionModule.abort()
    }

    // Reset state
    isListening = false
    hasReceivedResults = false
    lastResults = []
    isVoiceInitialized = false

    // Clear handlers
    Object.keys(eventHandlers).forEach(key => {
      delete (eventHandlers as any)[key]
    })

    console.log('[VOICE SERVICE] Cleanup completed')
  } catch (error) {
    console.error('[VOICE SERVICE ERROR] Error cleaning up:', error)
  }
}

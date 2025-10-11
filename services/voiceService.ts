import { Platform } from 'react-native'
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
  SpeechEndEvent,
  SpeechVolumeChangeEvent,
} from '@react-native-voice/voice'

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
let language = 'es-ES'
const eventHandlers: VoiceEventHandlers = {}
let lastResults: string[] = []
let hasReceivedResults = false

/**
 * Handle speech start event
 */
const handleSpeechStart = (_e: SpeechStartEvent): void => {
  console.log('=== SPEECH RECOGNITION STARTED ===')
  console.log('[STATUS]: Microphone is now listening')
  console.log('[LANGUAGE]:', language)
  console.log('[PLATFORM]:', Platform.OS)
  console.log('===================================\n')
  isListening = true
  hasReceivedResults = false
  lastResults = []

  if (eventHandlers.onStart) {
    eventHandlers.onStart()
  }
}

/**
 * Handle speech end event
 */
const handleSpeechEnd = (e: SpeechEndEvent): void => {
  console.log('=== SPEECH RECOGNITION ENDED ===')
  console.log('[STATUS]: Microphone stopped listening')
  console.log('[PLATFORM]:', Platform.OS)
  console.log('[HAS_RECEIVED_RESULTS]:', hasReceivedResults)
  console.log('[LAST_RESULTS]:', lastResults)
  console.log('[EVENT DATA]:', e)
  console.log('================================\n')

  isListening = false

  // iOS FIX: Si no recibimos resultados en onSpeechResults,
  // disparar el callback aquí con los últimos resultados guardados
  if (Platform.OS === 'ios' && !hasReceivedResults && lastResults.length > 0) {
    console.log('[iOS FIX]: Dispatching results from onSpeechEnd')
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
}

/**
 * Handle speech results
 * IMPORTANTE: En iOS este evento puede dispararse MÚLTIPLES veces mientras hablas
 * y a veces NO se dispara al final
 */
const handleSpeechResults = (e: SpeechResultsEvent): void => {
  console.log('=== SPEECH RECOGNITION RESULTS ===')
  console.log('[PLATFORM]:', Platform.OS)
  console.log('[RAW RESULTS]:', e.value)
  console.log('[RESULTS COUNT]:', e.value?.length || 0)

  // DEBUG: Check if handlers are set
  console.log('[DEBUG] eventHandlers object:', eventHandlers)
  console.log('[DEBUG] eventHandlers.onResults exists?', !!eventHandlers.onResults)
  console.log('[DEBUG] eventHandlers.onResults type:', typeof eventHandlers.onResults)

  if (e.value && e.value.length > 0) {
    console.log('[BEST MATCH]:', e.value[0])
    console.log('[ALL ALTERNATIVES]:', e.value.slice(0, 3))

    // Guardar resultados para iOS
    lastResults = e.value
    hasReceivedResults = true

    // En iOS, disparar el callback inmediatamente
    // En Android, esperar a onSpeechEnd
    if (Platform.OS === 'ios') {
      console.log('[iOS] Checking if should dispatch...')
      if (eventHandlers.onResults) {
        console.log('[iOS]: ✅ Dispatching results immediately')
        try {
          eventHandlers.onResults(e.value)
          console.log('[iOS]: ✅ Results dispatched successfully')
        } catch (error) {
          console.error('[iOS]: ❌ Error dispatching results:', error)
        }
      } else {
        console.log('[iOS]: ⚠️ WARNING - No onResults handler set!')
      }
    } else if (Platform.OS === 'android') {
      // Android: guardar para disparar en onSpeechEnd
      console.log('[Android]: Saving results for onSpeechEnd')
    }
  }

  console.log('=== END SPEECH RECOGNITION ===\n')
}

/**
 * Handle partial results (iOS principalmente)
 */
const handleSpeechPartialResults = (e: SpeechResultsEvent): void => {
  console.log('[PARTIAL RESULTS]:', e.value?.[0])

  // Actualizar lastResults con resultados parciales
  if (e.value && e.value.length > 0) {
    lastResults = e.value
  }
}

/**
 * Handle speech recognition error
 */
const handleSpeechError = (e: SpeechErrorEvent): void => {
  console.error('=== SPEECH ERROR ===')
  console.error('[PLATFORM]:', Platform.OS)
  console.error('[ERROR]:', e.error)
  console.error('[CODE]:', e.error?.code)
  console.error('[MESSAGE]:', e.error?.message)
  console.error('===================\n')

  isListening = false
  hasReceivedResults = false

  if (eventHandlers.onError) {
    eventHandlers.onError(e.error)
  }
}

/**
 * Handle volume change event
 */
const handleVolumeChange = (e: SpeechVolumeChangeEvent): void => {
  // Solo log en verbose mode para no spamear
  if (eventHandlers.onVolumeChange && e.value !== undefined) {
    eventHandlers.onVolumeChange(e.value)
  }
}

/**
 * Setup Voice recognition event listeners
 * CRITICAL: Don't call this on import - only call when handlers are set
 */
const setupVoiceListeners = (): void => {
  console.log('[VOICE SERVICE] Setting up Voice listeners')
  console.log('[VOICE SERVICE] Current eventHandlers:', Object.keys(eventHandlers))

  Voice.onSpeechStart = handleSpeechStart
  Voice.onSpeechEnd = handleSpeechEnd
  Voice.onSpeechResults = handleSpeechResults
  Voice.onSpeechPartialResults = handleSpeechPartialResults
  Voice.onSpeechError = handleSpeechError
  Voice.onSpeechVolumeChanged = handleVolumeChange

  console.log('[VOICE SERVICE] Voice listeners configured')
}

/**
 * Start voice recognition
 * @param lang - Language code (default: 'es-ES')
 */
export const startListening = async (lang?: string): Promise<void> => {
  try {
    if (isListening) {
      console.log('[VOICE SERVICE] Already listening, stopping first...')
      await stopListening()
      // Pequeño delay para asegurar que se detuvo
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const selectedLang = lang || language

    console.log('[VOICE SERVICE] Starting voice recognition')
    console.log('[LANGUAGE]:', selectedLang)
    console.log('[PLATFORM]:', Platform.OS)

    // Opciones específicas por plataforma
    const options =
      Platform.OS === 'android'
        ? {
            EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
            EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
            EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 1000,
          }
        : {} // iOS no usa estas opciones

    await Voice.start(selectedLang, options)

    console.log('[VOICE SERVICE] Voice recognition started successfully')
  } catch (error) {
    console.error('[VOICE SERVICE ERROR] Error starting voice recognition:', error)
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
    console.log('[VOICE SERVICE] Stopping voice recognition...')
    console.log('[VOICE SERVICE] Current state - isListening:', isListening)
    console.log('[VOICE SERVICE] Current state - hasResults:', hasReceivedResults)
    console.log('[VOICE SERVICE] Current state - lastResults:', lastResults)

    await Voice.stop()

    console.log('[VOICE SERVICE] Voice.stop() called successfully')
    console.log('[VOICE SERVICE] Waiting for events to complete...')

    // En iOS, a veces necesitamos un pequeño delay para que los eventos se disparen
    if (Platform.OS === 'ios') {
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  } catch (error) {
    console.error('[VOICE SERVICE ERROR] Error stopping voice recognition:', error)
    isListening = false
    throw error
  }
}

/**
 * Cancel voice recognition
 */
export const cancelListening = async (): Promise<void> => {
  try {
    console.log('[VOICE SERVICE] Cancelling voice recognition...')
    await Voice.cancel()
    isListening = false
    hasReceivedResults = false
    lastResults = []
    console.log('[VOICE SERVICE] Voice recognition cancelled')
  } catch (error) {
    console.error('[VOICE SERVICE ERROR] Error cancelling voice recognition:', error)
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

  // CRITICAL: Mutate the same object instead of reassigning
  // This ensures the closures in handlers keep the same reference
  Object.keys(eventHandlers).forEach(key => {
    delete (eventHandlers as any)[key]
  })
  Object.assign(eventHandlers, handlers)

  console.log('[VOICE SERVICE] Updated eventHandlers:', Object.keys(eventHandlers))

  // Re-setup listeners after updating handlers
  setupVoiceListeners()
  console.log('[VOICE SERVICE] Event handlers configured and listeners updated')
}

/**
 * Check if speech recognition is available
 */
export const isAvailable = async (): Promise<boolean> => {
  try {
    const available = await Voice.isAvailable()
    const isAvailableResult = available === 1 || Boolean(available)
    console.log('[VOICE SERVICE] Speech recognition available:', isAvailableResult)
    return isAvailableResult
  } catch (error) {
    console.error('[VOICE SERVICE ERROR] Error checking voice availability:', error)
    return false
  }
}

/**
 * Clean up voice recognition resources
 */
export const cleanup = async (): Promise<void> => {
  try {
    console.log('[VOICE SERVICE] Cleaning up...')
    await Voice.destroy()
    Voice.removeAllListeners()
    isListening = false
    hasReceivedResults = false
    lastResults = []

    // Clear handlers by mutating, not reassigning
    Object.keys(eventHandlers).forEach(key => {
      delete (eventHandlers as any)[key]
    })

    console.log('[VOICE SERVICE] Cleanup completed')
  } catch (error) {
    console.error('[VOICE SERVICE ERROR] Error cleaning up voice service:', error)
  }
}

// DON'T initialize listeners on import - wait for setEventHandlers()
// This prevents stale closure issues where handlers are empty

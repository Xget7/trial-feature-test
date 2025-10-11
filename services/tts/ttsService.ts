import * as Speech from 'expo-speech'

type EventType = 'start' | 'done' | 'stopped' | 'error'
type EventListener = () => void

const eventListeners: Map<EventType, Set<EventListener>> = new Map([
  ['start', new Set()],
  ['done', new Set()],
  ['stopped', new Set()],
  ['error', new Set()],
])

/**
 * Speak text using Text-to-Speech
 */
export const speak = async (
  text: string,
  options: {
    language?: string
    pitch?: number
    rate?: number
    voice?: string
  } = {}
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const { language = 'es-ES', pitch = 1.0, rate = 1.0, voice } = options

      console.log('[TTS] Speaking:', text.substring(0, 50))

      Speech.speak(text, {
        language,
        pitch,
        rate,
        voice,
        onStart: () => {
          console.log('[TTS] Started speaking')
          eventListeners.get('start')?.forEach(listener => listener())
        },
        onDone: () => {
          console.log('[TTS] Finished speaking')
          eventListeners.get('done')?.forEach(listener => listener())
          resolve()
        },
        onStopped: () => {
          console.log('[TTS] Stopped speaking')
          eventListeners.get('stopped')?.forEach(listener => listener())
          resolve()
        },
        onError: error => {
          console.error('[TTS] Error:', error)
          eventListeners.get('error')?.forEach(listener => listener())
          reject(error)
        },
      })
    } catch (error) {
      console.error('[TTS] Exception:', error)
      eventListeners.get('error')?.forEach(listener => listener())
      reject(error)
    }
  })
}

/**
 * Stop current speech
 */
export const stop = async (): Promise<void> => {
  try {
    await Speech.stop()
    console.log('[TTS] Stopped')
  } catch (error) {
    console.error('[TTS] Error stopping:', error)
    throw error
  }
}

/**
 * Pause current speech
 */
export const pause = async (): Promise<void> => {
  try {
    await Speech.pause()
    console.log('[TTS] Paused')
  } catch (error) {
    console.error('[TTS] Error pausing:', error)
    throw error
  }
}

/**
 * Resume paused speech
 */
export const resume = async (): Promise<void> => {
  try {
    await Speech.resume()
    console.log('[TTS] Resumed')
  } catch (error) {
    console.error('[TTS] Error resuming:', error)
    throw error
  }
}

/**
 * Check if currently speaking
 */
export const isSpeaking = async (): Promise<boolean> => {
  try {
    return await Speech.isSpeakingAsync()
  } catch (error) {
    console.error('[TTS] Error checking if speaking:', error)
    return false
  }
}

/**
 * Get available voices
 */
export const getAvailableVoices = async () => {
  try {
    return await Speech.getAvailableVoicesAsync()
  } catch (error) {
    console.error('[TTS] Error getting voices:', error)
    return []
  }
}

/**
 * Add event listener
 */
export const addEventListener = (event: EventType, listener: EventListener): (() => void) => {
  eventListeners.get(event)?.add(listener)
  console.log(`[TTS] Added ${event} listener`)

  // Return cleanup function
  return () => {
    eventListeners.get(event)?.delete(listener)
    console.log(`[TTS] Removed ${event} listener`)
  }
}

/**
 * Remove event listener
 */
export const removeEventListener = (event: EventType, listener: EventListener): void => {
  eventListeners.get(event)?.delete(listener)
  console.log(`[TTS] Removed ${event} listener`)
}

/**
 * Cleanup - stop speaking and remove all listeners
 */
export const cleanup = async (): Promise<void> => {
  try {
    await stop()
    eventListeners.forEach(listeners => listeners.clear())
    console.log('[TTS] Cleaned up')
  } catch (error) {
    console.error('[TTS] Error cleaning up:', error)
  }
}

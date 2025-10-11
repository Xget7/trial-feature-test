import * as Speech from 'expo-speech'
import * as Network from 'expo-network'
import ElevenLabsTTSService, { ElevenLabsModel } from './elevenLabsTTS'

type EventType = 'start' | 'done' | 'stopped' | 'error'
type EventListener = () => void
type TTSProvider = 'elevenlabs' | 'native'

const eventListeners: Map<EventType, Set<EventListener>> = new Map([
  ['start', new Set()],
  ['done', new Set()],
  ['stopped', new Set()],
  ['error', new Set()],
])

class HybridTTSService {
  private elevenLabs: ElevenLabsTTSService | null = null
  private currentProvider: TTSProvider = 'native'
  private preferCloudTTS: boolean = true
  private elevenLabsApiKey: string | null = null

  constructor(config?: {
    elevenLabsApiKey?: string
    preferCloudTTS?: boolean
    elevenLabsModel?: ElevenLabsModel
  }) {
    if (config?.elevenLabsApiKey) {
      this.elevenLabsApiKey = config.elevenLabsApiKey
      this.elevenLabs = new ElevenLabsTTSService(
        config.elevenLabsApiKey,
        config.elevenLabsModel || 'eleven_turbo_v2_5' // Default to v3 Turbo
      )
    }
    this.preferCloudTTS = config?.preferCloudTTS ?? true
  }

  /**
   * Set ElevenLabs API key
   */
  setElevenLabsApiKey(apiKey: string): void {
    this.elevenLabsApiKey = apiKey
    this.elevenLabs = new ElevenLabsTTSService(apiKey)
    console.log('[TTS] ElevenLabs API key configured')
  }

  /**
   * Check if device is online
   */
  private async isOnline(): Promise<boolean> {
    try {
      const networkState = await Network.getNetworkStateAsync()
      return networkState.isConnected === true && networkState.isInternetReachable === true
    } catch (error) {
      console.error('[TTS] Error checking network:', error)
      return false
    }
  }

  /**
   * Determine which TTS provider to use
   */
  private async selectProvider(): Promise<TTSProvider> {
    if (!this.preferCloudTTS || !this.elevenLabs) {
      return 'native'
    }

    const online = await this.isOnline()
    return online ? 'elevenlabs' : 'native'
  }

  /**
   * Speak text using the best available TTS provider
   */
  async speak(
    text: string,
    options: {
      language?: string
      pitch?: number
      rate?: number
      voice?: string
      voiceId?: string // ElevenLabs voice ID
      model?: ElevenLabsModel // ElevenLabs model
      stability?: number
      similarityBoost?: number
      style?: number
      optimizeStreamingLatency?: number
      conversational?: boolean // Use conversational AI features
      forceProvider?: TTSProvider
    } = {}
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const provider = options.forceProvider || (await this.selectProvider())
        this.currentProvider = provider

        console.log(`[TTS] Using provider: ${provider}`)

        eventListeners.get('start')?.forEach(listener => listener())

        if (provider === 'elevenlabs' && this.elevenLabs) {
          try {
            // Use conversational mode if requested
            if (options.conversational) {
              await this.elevenLabs.speakConversational(text, {
                voiceId: options.voiceId,
                stability: options.stability,
                similarityBoost: options.similarityBoost,
                style: options.style,
                optimizeStreamingLatency: options.optimizeStreamingLatency,
              })
            } else {
              await this.elevenLabs.speak(text, {
                voiceId: options.voiceId,
                model: options.model,
                stability: options.stability,
                similarityBoost: options.similarityBoost,
                style: options.style,
                optimizeStreamingLatency: options.optimizeStreamingLatency,
              })
            }
            eventListeners.get('done')?.forEach(listener => listener())
            resolve()
          } catch (error) {
            console.warn('[TTS] ElevenLabs failed, falling back to native:', error)
            // Fallback to native
            await this.speakNative(text, options)
            resolve()
          }
        } else {
          // Use native TTS
          await this.speakNative(text, options)
          resolve()
        }
      } catch (error) {
        console.error('[TTS] Error:', error)
        eventListeners.get('error')?.forEach(listener => listener())
        reject(error)
      }
    })
  }

  /**
   * Speak using native expo-speech
   */
  private async speakNative(
    text: string,
    options: {
      language?: string
      pitch?: number
      rate?: number
      voice?: string
    }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const { language = 'es-ES', pitch = 1.0, rate = 1.0, voice } = options

      console.log('[TTS] Speaking with native TTS:', text.substring(0, 50))

      Speech.speak(text, {
        language,
        pitch,
        rate,
        voice,
        onStart: () => {
          console.log('[TTS] Native TTS started')
        },
        onDone: () => {
          console.log('[TTS] Native TTS finished')
          eventListeners.get('done')?.forEach(listener => listener())
          resolve()
        },
        onStopped: () => {
          console.log('[TTS] Native TTS stopped')
          eventListeners.get('stopped')?.forEach(listener => listener())
          resolve()
        },
        onError: error => {
          console.error('[TTS] Native TTS error:', error)
          eventListeners.get('error')?.forEach(listener => listener())
          reject(error)
        },
      })
    })
  }

  /**
   * Stop current speech
   */
  async stop(): Promise<void> {
    try {
      if (this.currentProvider === 'elevenlabs' && this.elevenLabs) {
        await this.elevenLabs.stop()
      } else {
        await Speech.stop()
      }
      console.log('[TTS] Stopped')
    } catch (error) {
      console.error('[TTS] Error stopping:', error)
      throw error
    }
  }

  /**
   * Pause current speech
   */
  async pause(): Promise<void> {
    try {
      if (this.currentProvider === 'elevenlabs' && this.elevenLabs) {
        await this.elevenLabs.pause()
      } else {
        await Speech.pause()
      }
      console.log('[TTS] Paused')
    } catch (error) {
      console.error('[TTS] Error pausing:', error)
      throw error
    }
  }

  /**
   * Resume paused speech
   */
  async resume(): Promise<void> {
    try {
      if (this.currentProvider === 'elevenlabs' && this.elevenLabs) {
        await this.elevenLabs.resume()
      } else {
        await Speech.resume()
      }
      console.log('[TTS] Resumed')
    } catch (error) {
      console.error('[TTS] Error resuming:', error)
      throw error
    }
  }

  /**
   * Check if currently speaking
   */
  async isSpeaking(): Promise<boolean> {
    try {
      if (this.currentProvider === 'elevenlabs' && this.elevenLabs) {
        return await this.elevenLabs.isPlaying()
      } else {
        return await Speech.isSpeakingAsync()
      }
    } catch (error) {
      console.error('[TTS] Error checking if speaking:', error)
      return false
    }
  }

  /**
   * Get available voices based on current provider
   */
  async getAvailableVoices(): Promise<any[]> {
    try {
      const provider = await this.selectProvider()

      if (provider === 'elevenlabs' && this.elevenLabs) {
        const voices = await this.elevenLabs.fetchVoices()
        return voices
      } else {
        return await Speech.getAvailableVoicesAsync()
      }
    } catch (error) {
      console.error('[TTS] Error getting voices:', error)
      return []
    }
  }

  /**
   * Get current provider
   */
  getCurrentProvider(): TTSProvider {
    return this.currentProvider
  }

  /**
   * Set preference for cloud TTS
   */
  setPreferCloudTTS(prefer: boolean): void {
    this.preferCloudTTS = prefer
    console.log(`[TTS] Cloud TTS preference set to: ${prefer}`)
  }

  /**
   * Add event listener
   */
  addEventListener(event: EventType, listener: EventListener): () => void {
    eventListeners.get(event)?.add(listener)
    console.log(`[TTS] Added ${event} listener`)

    return () => {
      eventListeners.get(event)?.delete(listener)
      console.log(`[TTS] Removed ${event} listener`)
    }
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: EventType, listener: EventListener): void {
    eventListeners.get(event)?.delete(listener)
    console.log(`[TTS] Removed ${event} listener`)
  }

  /**
   * Cleanup - stop speaking and remove all listeners
   */
  async cleanup(): Promise<void> {
    try {
      await this.stop()
      eventListeners.forEach(listeners => listeners.clear())
      console.log('[TTS] Cleaned up')
    } catch (error) {
      console.error('[TTS] Error cleaning up:', error)
    }
  }
}

// Create singleton instance
let ttsInstance: HybridTTSService | null = null

/**
 * Initialize TTS service
 */
export const initTTS = (config?: {
  elevenLabsApiKey?: string
  preferCloudTTS?: boolean
  elevenLabsModel?: ElevenLabsModel
}): HybridTTSService => {
  if (!ttsInstance) {
    ttsInstance = new HybridTTSService(config)
  } else if (config?.elevenLabsApiKey) {
    ttsInstance.setElevenLabsApiKey(config.elevenLabsApiKey)
  }
  return ttsInstance
}

/**
 * Get TTS instance
 */
export const getTTS = (): HybridTTSService => {
  if (!ttsInstance) {
    ttsInstance = new HybridTTSService()
  }
  return ttsInstance
}

// Export convenience functions that use the singleton
export const speak = async (text: string, options?: any) => {
  return getTTS().speak(text, options)
}

export const stop = async () => {
  return getTTS().stop()
}

export const pause = async () => {
  return getTTS().pause()
}

export const resume = async () => {
  return getTTS().resume()
}

export const isSpeaking = async () => {
  return getTTS().isSpeaking()
}

export const getAvailableVoices = async () => {
  return getTTS().getAvailableVoices()
}

export const addEventListener = (event: EventType, listener: EventListener) => {
  return getTTS().addEventListener(event, listener)
}

export const removeEventListener = (event: EventType, listener: EventListener) => {
  return getTTS().removeEventListener(event, listener)
}

export const cleanup = async () => {
  return getTTS().cleanup()
}

export default HybridTTSService
export type { ElevenLabsModel }

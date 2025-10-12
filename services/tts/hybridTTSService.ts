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
    console.log('[TTS INIT] 🚀 Initializing Hybrid TTS Service')
    console.log('[TTS INIT] Config:', {
      hasApiKey: !!config?.elevenLabsApiKey,
      apiKeyLength: config?.elevenLabsApiKey?.length || 0,
      apiKeyPreview: config?.elevenLabsApiKey?.substring(0, 10) + '...',
      preferCloudTTS: config?.preferCloudTTS ?? true,
      model: config?.elevenLabsModel || 'eleven_turbo_v2_5',
    })

    if (config?.elevenLabsApiKey) {
      this.elevenLabsApiKey = config.elevenLabsApiKey
      console.log('[TTS INIT] ✅ Creating ElevenLabs service instance')
      this.elevenLabs = new ElevenLabsTTSService(
        config.elevenLabsApiKey,
        config.elevenLabsModel || 'eleven_multilingual_v2'
      )
      console.log('[TTS INIT] ✅ ElevenLabs instance created')
    } else {
      console.log('[TTS INIT] ⚠️ No API key provided - will use native TTS only')
    }

    this.preferCloudTTS = config?.preferCloudTTS ?? true
    console.log('[TTS INIT] preferCloudTTS set to:', this.preferCloudTTS)
  }

  /**
   * Set ElevenLabs API key
   */
  setElevenLabsApiKey(apiKey: string): void {
    console.log('[TTS] 🔑 Setting ElevenLabs API key:', apiKey.substring(0, 10) + '...')
    this.elevenLabsApiKey = apiKey
    this.elevenLabs = new ElevenLabsTTSService(apiKey)
    console.log('[TTS] ✅ ElevenLabs API key configured')
  }

  /**
   * Check if device is online
   */
  private async isOnline(): Promise<boolean> {
    try {
      console.log('[TTS NETWORK] 🌐 Checking network connection...')
      const networkState = await Network.getNetworkStateAsync()
      console.log('[TTS NETWORK] Network state:', {
        isConnected: networkState.isConnected,
        isInternetReachable: networkState.isInternetReachable,
        type: networkState.type,
      })

      const online = networkState.isConnected === true && networkState.isInternetReachable === true
      console.log('[TTS NETWORK]', online ? '✅ Device is ONLINE' : '❌ Device is OFFLINE')
      return online
    } catch (error) {
      console.error('[TTS NETWORK] ❌ Error checking network:', error)
      return false
    }
  }

  /**
   * Determine which TTS provider to use
   */
  private async selectProvider(): Promise<TTSProvider> {
    console.log('[TTS SELECT] 🤔 Selecting TTS provider...')
    console.log('[TTS SELECT] preferCloudTTS:', this.preferCloudTTS)
    console.log('[TTS SELECT] has elevenLabs instance:', !!this.elevenLabs)
    console.log('[TTS SELECT] has API key:', !!this.elevenLabsApiKey)

    if (!this.preferCloudTTS) {
      console.log('[TTS SELECT] ➡️ User preference: NATIVE (preferCloudTTS is false)')
      return 'native'
    }

    if (!this.elevenLabs) {
      console.log('[TTS SELECT] ➡️ No ElevenLabs instance: NATIVE')
      return 'native'
    }

    if (!this.elevenLabsApiKey) {
      console.log('[TTS SELECT] ➡️ No API key: NATIVE')
      return 'native'
    }

    const online = await this.isOnline()
    const provider = online ? 'elevenlabs' : 'native'

    console.log('[TTS SELECT] ✅ Selected provider:', provider.toUpperCase())
    return provider
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
      voiceId?: string
      model?: ElevenLabsModel
      stability?: number
      similarityBoost?: number
      style?: number
      optimizeStreamingLatency?: number
      conversational?: boolean
      forceProvider?: TTSProvider
    } = {}
  ): Promise<void> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[TTS SPEAK] 🎤 Starting speak request')
    console.log('[TTS SPEAK] Text:', text.substring(0, 100))
    console.log('[TTS SPEAK] Options:', {
      forceProvider: options.forceProvider,
      conversational: options.conversational,
      voiceId: options.voiceId,
      model: options.model,
      language: options.language,
    })

    return new Promise(async (resolve, reject) => {
      try {
        const provider = options.forceProvider || (await this.selectProvider())
        this.currentProvider = provider

        console.log(`[TTS SPEAK] 🎯 FINAL PROVIDER: ${provider.toUpperCase()}`)
        console.log('[TTS SPEAK] preferCloudTTS:', this.preferCloudTTS)
        console.log('[TTS SPEAK] has elevenLabs:', !!this.elevenLabs)
        console.log('[TTS SPEAK] has API key:', !!this.elevenLabsApiKey)

        eventListeners.get('start')?.forEach(listener => listener())

        if (provider === 'elevenlabs' && this.elevenLabs) {
          console.log('[TTS SPEAK] ☁️ Attempting ElevenLabs TTS...')

          try {
            if (options.conversational) {
              console.log('[TTS SPEAK] 💬 Using conversational mode')
              await this.elevenLabs.speakConversational(text, {
                voiceId: options.voiceId,
                stability: options.stability,
                similarityBoost: options.similarityBoost,
                style: options.style,
                optimizeStreamingLatency: options.optimizeStreamingLatency,
              })
            } else {
              console.log('[TTS SPEAK] 🗣️ Using standard mode')
              await this.elevenLabs.speak(text, {
                voiceId: options.voiceId,
                model: options.model,
                stability: options.stability,
                similarityBoost: options.similarityBoost,
                style: options.style,
                optimizeStreamingLatency: options.optimizeStreamingLatency,
              })
            }

            console.log('[TTS SPEAK] ✅ ElevenLabs TTS completed successfully!')
            eventListeners.get('done')?.forEach(listener => listener())
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            resolve()
          } catch (error) {
            console.error('[TTS SPEAK] ❌ ElevenLabs FAILED:', error)
            console.error('[TTS SPEAK] Error details:', JSON.stringify(error, null, 2))
            console.warn('[TTS SPEAK] ⚠️ Falling back to native TTS...')

            // Fallback to native
            await this.speakNative(text, options)
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            resolve()
          }
        } else {
          console.log('[TTS SPEAK] 📱 Using native TTS')
          console.log(
            '[TTS SPEAK] Reason:',
            !this.preferCloudTTS
              ? 'User preference'
              : !this.elevenLabs
                ? 'No ElevenLabs instance'
                : !this.elevenLabsApiKey
                  ? 'No API key'
                  : 'Offline or forced native'
          )

          await this.speakNative(text, options)
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          resolve()
        }
      } catch (error) {
        console.error('[TTS SPEAK] ❌ Fatal error:', error)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
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

      console.log('[TTS NATIVE] 📱 Starting native TTS')
      console.log('[TTS NATIVE] Text:', text.substring(0, 50) + '...')
      console.log('[TTS NATIVE] Options:', { language, pitch, rate, voice })

      Speech.speak(text, {
        language,
        pitch,
        rate,
        voice,
        onStart: () => {
          console.log('[TTS NATIVE] ✅ Started')
        },
        onDone: () => {
          console.log('[TTS NATIVE] ✅ Finished')
          eventListeners.get('done')?.forEach(listener => listener())
          resolve()
        },
        onStopped: () => {
          console.log('[TTS NATIVE] 🛑 Stopped')
          eventListeners.get('stopped')?.forEach(listener => listener())
          resolve()
        },
        onError: error => {
          console.error('[TTS NATIVE] ❌ Error:', error)
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
      console.log('[TTS] 🛑 Stopping speech, provider:', this.currentProvider)
      if (this.currentProvider === 'elevenlabs' && this.elevenLabs) {
        await this.elevenLabs.stop()
      } else {
        await Speech.stop()
      }
      console.log('[TTS] ✅ Stopped')
    } catch (error) {
      console.error('[TTS] ❌ Error stopping:', error)
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
      console.log('[TTS] ⏸️ Paused')
    } catch (error) {
      console.error('[TTS] ❌ Error pausing:', error)
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
      console.log('[TTS] ▶️ Resumed')
    } catch (error) {
      console.error('[TTS] ❌ Error resuming:', error)
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
      console.error('[TTS] ❌ Error checking if speaking:', error)
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
      console.error('[TTS] ❌ Error getting voices:', error)
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
    console.log(`[TTS] ⚙️ Cloud TTS preference set to: ${prefer}`)
  }

  /**
   * Add event listener
   */
  addEventListener(event: EventType, listener: EventListener): () => void {
    eventListeners.get(event)?.add(listener)
    console.log(`[TTS] 👂 Added ${event} listener`)

    return () => {
      eventListeners.get(event)?.delete(listener)
      console.log(`[TTS] 🔇 Removed ${event} listener`)
    }
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: EventType, listener: EventListener): void {
    eventListeners.get(event)?.delete(listener)
    console.log(`[TTS] 🔇 Removed ${event} listener`)
  }

  /**
   * Cleanup - stop speaking and remove all listeners
   */
  async cleanup(): Promise<void> {
    try {
      await this.stop()
      eventListeners.forEach(listeners => listeners.clear())
      console.log('[TTS] 🧹 Cleaned up')
    } catch (error) {
      console.error('[TTS] ❌ Error cleaning up:', error)
    }
  }

  /**
   * Debug method to check TTS status
   */
  getDebugInfo(): any {
    return {
      hasElevenLabs: !!this.elevenLabs,
      hasApiKey: !!this.elevenLabsApiKey,
      apiKeyPreview: this.elevenLabsApiKey?.substring(0, 10) + '...',
      preferCloudTTS: this.preferCloudTTS,
      currentProvider: this.currentProvider,
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
  console.log('[TTS] 🎬 initTTS called')

  if (!ttsInstance) {
    console.log('[TTS] 🆕 Creating new TTS instance')
    ttsInstance = new HybridTTSService(config)
  } else {
    console.log('[TTS] ♻️ Reusing existing TTS instance')
    if (config?.elevenLabsApiKey) {
      console.log('[TTS] 🔑 Updating API key on existing instance')
      ttsInstance.setElevenLabsApiKey(config.elevenLabsApiKey)
    }
  }

  console.log('[TTS] Debug info:', ttsInstance.getDebugInfo())
  return ttsInstance
}

/**
 * Get TTS instance
 */
export const getTTS = (): HybridTTSService => {
  if (!ttsInstance) {
    console.log('[TTS] ⚠️ getTTS called but no instance exists, creating default')
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

/**
 * Debug function to check TTS status
 */
export const getDebugInfo = () => {
  return getTTS().getDebugInfo()
}

export default HybridTTSService
export type { ElevenLabsModel }

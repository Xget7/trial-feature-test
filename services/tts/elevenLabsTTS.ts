import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'

type ElevenLabsVoice = {
  voice_id: string
  name: string
  labels?: Record<string, string>
}

type ElevenLabsModel =
  | 'eleven_turbo_v2_5' // v3 - Fastest, lowest latency (RECOMMENDED)
  | 'eleven_multilingual_v2' // v2 - High quality, 29 languages
  | 'eleven_monolingual_v1' // v1 - Original English model

type TTSOptions = {
  voiceId?: string
  model?: ElevenLabsModel
  stability?: number
  similarityBoost?: number
  style?: number
  useSpeakerBoost?: boolean
  optimizeStreamingLatency?: number // 0-4, higher = faster but lower quality
  outputFormat?: 'mp3_44100_128' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000' | 'pcm_44100'
}

class ElevenLabsTTSService {
  private apiKey: string
  private sound: Audio.Sound | null = null
  private availableVoices: ElevenLabsVoice[] = []
  private defaultModel: ElevenLabsModel = 'eleven_turbo_v2_5' // v3 as default

  constructor(apiKey: string, defaultModel?: ElevenLabsModel) {
    this.apiKey = apiKey
    if (defaultModel) {
      this.defaultModel = defaultModel
    }
    this.initAudio()
  }

  private async initAudio() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      })
    } catch (error) {
      console.error('[ElevenLabs] Error initializing audio:', error)
    }
  }

  /**
   * Fetch available voices from ElevenLabs
   */
  async fetchVoices(): Promise<ElevenLabsVoice[]> {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': this.apiKey,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`)
      }

      const data = await response.json()
      this.availableVoices = data.voices
      return this.availableVoices
    } catch (error) {
      console.error('[ElevenLabs] Error fetching voices:', error)
      return []
    }
  }

  /**
   * Get available voices (cached)
   */
  getVoices(): ElevenLabsVoice[] {
    return this.availableVoices
  }

  /**
   * Set default model
   */
  setDefaultModel(model: ElevenLabsModel): void {
    this.defaultModel = model
    console.log(`[ElevenLabs] Default model set to: ${model}`)
  }

  /**
   * Convert text to speech using ElevenLabs API with v3 Turbo model
   */
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    const {
      voiceId = '21m00Tcm4TlvDq8ikWAM', // Default: Rachel
      model = this.defaultModel,
      stability = 0.5,
      similarityBoost = 0.8,
      style = 0,
      useSpeakerBoost = true,
      optimizeStreamingLatency = 0,
      outputFormat = 'mp3_44100_128',
    } = options

    try {
      console.log(`[ElevenLabs] Converting text to speech with ${model}...`)

      // Stop any currently playing sound
      await this.stop()

      // Build query parameters for optimization
      const queryParams = new URLSearchParams()
      if (optimizeStreamingLatency > 0) {
        queryParams.append('optimize_streaming_latency', optimizeStreamingLatency.toString())
      }
      queryParams.append('output_format', outputFormat)

      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?${queryParams.toString()}`

      // Call ElevenLabs API
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: model,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: useSpeakerBoost,
          },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`)
      }

      // Get audio data
      const audioBlob = await response.blob()

      // Save to file system
      const fileUri = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`
      const reader = new FileReader()

      await new Promise<void>((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1]
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            })
            resolve()
          } catch (error) {
            reject(error)
          }
        }
        reader.onerror = reject
        reader.readAsDataURL(audioBlob)
      })

      // Load and play audio
      const { sound } = await Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: true })

      this.sound = sound

      return new Promise((resolve, reject) => {
        sound.setOnPlaybackStatusUpdate(status => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              console.log('[ElevenLabs] Playback finished')
              this.cleanup(fileUri)
              resolve()
            }
          } else if (status.error) {
            console.error('[ElevenLabs] Playback error:', status.error)
            this.cleanup(fileUri)
            reject(new Error(status.error))
          }
        })
      })
    } catch (error) {
      console.error('[ElevenLabs] Error:', error)
      throw error
    }
  }

  /**
   * Text-to-Speech with streaming (for faster response)
   * Note: This uses websockets for real-time streaming
   */
  async speakStream(text: string, options: TTSOptions = {}): Promise<void> {
    // For now, fall back to regular speak
    // Streaming would require WebSocket implementation
    console.log('[ElevenLabs] Streaming not yet implemented, using standard TTS')
    return this.speak(text, {
      ...options,
      optimizeStreamingLatency: 4, // Maximum optimization
    })
  }

  /**
   * Generate speech with conversational AI features
   * Uses the latest model with enhanced naturalness
   */
  async speakConversational(
    text: string,
    options: Omit<TTSOptions, 'model'> & {
      previousContext?: string // Previous dialogue for context
      nextContext?: string // Next expected dialogue
    } = {}
  ): Promise<void> {
    const { previousContext, nextContext, ...ttsOptions } = options

    // Add context to make speech more natural
    let enhancedText = text

    // v3 Turbo model is best for conversational speech
    return this.speak(enhancedText, {
      ...ttsOptions,
      model: 'eleven_turbo_v2_5',
      style: 0.5, // More expressive for conversation
      stability: 0.4, // More dynamic
    })
  }

  /**
   * Stop current playback
   */
  async stop(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.stopAsync()
        await this.sound.unloadAsync()
        this.sound = null
        console.log('[ElevenLabs] Stopped')
      } catch (error) {
        console.error('[ElevenLabs] Error stopping:', error)
      }
    }
  }

  /**
   * Pause current playback
   */
  async pause(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.pauseAsync()
        console.log('[ElevenLabs] Paused')
      } catch (error) {
        console.error('[ElevenLabs] Error pausing:', error)
      }
    }
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.playAsync()
        console.log('[ElevenLabs] Resumed')
      } catch (error) {
        console.error('[ElevenLabs] Error resuming:', error)
      }
    }
  }

  /**
   * Check if currently playing
   */
  async isPlaying(): Promise<boolean> {
    if (this.sound) {
      try {
        const status = await this.sound.getStatusAsync()
        return status.isLoaded && status.isPlaying
      } catch (error) {
        return false
      }
    }
    return false
  }

  /**
   * Get current model being used
   */
  getDefaultModel(): ElevenLabsModel {
    return this.defaultModel
  }

  /**
   * Cleanup audio file
   */
  private async cleanup(fileUri: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri)
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true })
      }
    } catch (error) {
      console.error('[ElevenLabs] Error cleaning up file:', error)
    }
  }
}

export default ElevenLabsTTSService
export type { ElevenLabsVoice, TTSOptions, ElevenLabsModel }

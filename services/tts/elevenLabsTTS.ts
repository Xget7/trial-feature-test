import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'

type ElevenLabsVoice = {
  voice_id: string
  name: string
  labels?: Record<string, string>
}

type ElevenLabsModel =
  | 'eleven_v3' // v3 - Fastest, lowest latency (RECOMMENDED)
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
  private defaultModel: ElevenLabsModel = 'eleven_multilingual_v2' // v3 as default

  constructor(apiKey: string, defaultModel?: ElevenLabsModel) {
    console.log('[ELEVENLABS] 🏗️ Creating ElevenLabs TTS Service')
    console.log('[ELEVENLABS] Default model:', defaultModel || 'eleven_multilingual_v2')

    this.apiKey = apiKey
    if (defaultModel) {
      this.defaultModel = defaultModel
    }
    this.initAudio()
  }

  private async initAudio() {
    try {
      console.log('[ELEVENLABS] 🎵 Initializing audio mode...')
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      })
      console.log('[ELEVENLABS] ✅ Audio mode initialized')
    } catch (error) {
      console.error('[ELEVENLABS] ❌ Error initializing audio:', error)
    }
  }

  /**
   * Fetch available voices from ElevenLabs
   */
  async fetchVoices(): Promise<ElevenLabsVoice[]> {
    try {
      console.log('[ELEVENLABS] 🎤 Fetching available voices...')
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': this.apiKey,
        },
      })

      console.log('[ELEVENLABS] Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[ELEVENLABS] ❌ Failed to fetch voices:', response.status, errorText)
        throw new Error(`Failed to fetch voices: ${response.status}`)
      }

      const data = await response.json()
      this.availableVoices = data.voices
      console.log('[ELEVENLABS] ✅ Fetched', this.availableVoices.length, 'voices')
      return this.availableVoices
    } catch (error) {
      console.error('[ELEVENLABS] ❌ Error fetching voices:', error)
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
    console.log(`[ELEVENLABS] ⚙️ Default model set to: ${model}`)
  }

  /**
   * Convert text to speech using ElevenLabs API with v3 Turbo model
   */
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    const {
      voiceId = '21m00Tcm4TlvDq8ikWAM',
      model = this.defaultModel,
      stability = 0.5,
      similarityBoost = 0.8,
      style = 0,
      useSpeakerBoost = false,
      optimizeStreamingLatency = 0,
      outputFormat = 'mp3_44100_128',
    } = options

    console.log('╔════════════════════════════════════════╗')
    console.log('║   ELEVENLABS TTS REQUEST              ║')
    console.log('╚════════════════════════════════════════╝')
    console.log('[ELEVENLABS] Text length:', text.length, 'characters')
    console.log('[ELEVENLABS] Voice ID:', voiceId)
    console.log('[ELEVENLABS] Model:', model)
    console.log('[ELEVENLABS] API Key:', this.apiKey.substring(0, 10) + '...')

    try {
      // Stop any currently playing sound
      if (this.sound) {
        console.log('[ELEVENLABS] 🛑 Stopping previous sound')
        await this.stop()
      }

      const queryParams = new URLSearchParams()
      if (optimizeStreamingLatency > 0 && model !== 'eleven_v3') {
        queryParams.append('optimize_streaming_latency', optimizeStreamingLatency.toString())
      }
      queryParams.append('output_format', outputFormat)

      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?${queryParams.toString()}`

      console.log('[ELEVENLABS] 📡 API URL:', url)
      console.log('[ELEVENLABS] 🚀 Making API request...')

      const requestBody = {
        text,
        model_id: model,
        voice_settings: {
          speed: 1.0,
        },
      }

      console.log('[ELEVENLABS] Request body:', JSON.stringify(requestBody, null, 2))

      // Call ElevenLabs API
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('[ELEVENLABS] 📥 Response status:', response.status)
      console.log(
        '[ELEVENLABS] Response headers:',
        JSON.stringify(Object.fromEntries(response.headers), null, 2)
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[ELEVENLABS] ❌ API ERROR!')
        console.error('[ELEVENLABS] Status:', response.status)
        console.error('[ELEVENLABS] Error body:', errorText)
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`)
      }

      console.log('[ELEVENLABS] ✅ API request successful!')
      console.log('[ELEVENLABS] 📦 Getting audio blob...')

      // Get audio data
      const audioBlob = await response.blob()
      console.log('[ELEVENLABS] Blob size:', audioBlob.size, 'bytes')

      // Save to file system
      const fileUri = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`
      console.log('[ELEVENLABS] 💾 Saving to:', fileUri)

      const reader = new FileReader()

      await new Promise<void>((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1]
            console.log('[ELEVENLABS] Base64 data length:', base64Data.length)

            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            })
            console.log('[ELEVENLABS] ✅ File saved successfully')
            resolve()
          } catch (error) {
            console.error('[ELEVENLABS] ❌ Error saving file:', error)
            reject(error)
          }
        }
        reader.onerror = error => {
          console.error('[ELEVENLABS] ❌ FileReader error:', error)
          reject(error)
        }
        reader.readAsDataURL(audioBlob)
      })

      // Load and play audio
      console.log('[ELEVENLABS] 🎵 Loading audio file...')
      const { sound } = await Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: true })

      this.sound = sound
      console.log('[ELEVENLABS] ✅ Audio loaded, playing...')

      return new Promise((resolve, reject) => {
        sound.setOnPlaybackStatusUpdate(status => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              console.log('[ELEVENLABS] ✅ Playback finished')
              console.log('╚════════════════════════════════════════╝')
              this.cleanup(fileUri)
              resolve()
            }
          } else if (status.error) {
            console.error('[ELEVENLABS] ❌ Playback error:', status.error)
            console.log('╚════════════════════════════════════════╝')
            this.cleanup(fileUri)
            reject(new Error(status.error))
          }
        })
      })
    } catch (error) {
      console.error('[ELEVENLABS] ❌ FATAL ERROR:', error)
      console.error('[ELEVENLABS] Error type:', typeof error)
      console.error('[ELEVENLABS] Error details:', JSON.stringify(error, null, 2))
      console.log('╚════════════════════════════════════════╝')
      throw error
    }
  }

  /**
   * Text-to-Speech with streaming (for faster response)
   */
  async speakStream(text: string, options: TTSOptions = {}): Promise<void> {
    console.log('[ELEVENLABS] 🌊 Streaming not yet implemented, using standard TTS')
    return this.speak(text, {
      ...options,
      optimizeStreamingLatency: 4, // Maximum optimization
    })
  }

  /**
   * Generate speech with conversational AI features
   */
  async speakConversational(
    text: string,
    options: Omit<TTSOptions, 'model'> & {
      previousContext?: string
      nextContext?: string
    } = {}
  ): Promise<void> {
    console.log('[ELEVENLABS] 💬 Using conversational mode')
    const { previousContext, nextContext, ...ttsOptions } = options

    return this.speak(text, {
      ...ttsOptions,
      model: 'eleven_multilingual_v2',
    })
  }

  /**
   * Stop current playback
   */
  async stop(): Promise<void> {
    if (this.sound) {
      try {
        console.log('[ELEVENLABS] 🛑 Stopping playback')
        await this.sound.stopAsync()
        await this.sound.unloadAsync()
        this.sound = null
        console.log('[ELEVENLABS] ✅ Stopped')
      } catch (error) {
        console.error('[ELEVENLABS] ❌ Error stopping:', error)
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
        console.log('[ELEVENLABS] ⏸️ Paused')
      } catch (error) {
        console.error('[ELEVENLABS] ❌ Error pausing:', error)
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
        console.log('[ELEVENLABS] ▶️ Resumed')
      } catch (error) {
        console.error('[ELEVENLABS] ❌ Error resuming:', error)
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
      console.log('[ELEVENLABS] 🧹 Cleaning up file:', fileUri)
      const fileInfo = await FileSystem.getInfoAsync(fileUri)
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true })
        console.log('[ELEVENLABS] ✅ File deleted')
      }
    } catch (error) {
      console.error('[ELEVENLABS] ❌ Error cleaning up file:', error)
    }
  }
}

export default ElevenLabsTTSService
export type { ElevenLabsVoice, TTSOptions, ElevenLabsModel }

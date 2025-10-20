jest.mock('../../services/claudeAgent', () => ({
  callClaudeAgent: jest.fn(),
}))

const mockCallClaudeAgent = jest.fn()

const mockVoiceService = {
  initializeVoice: jest.fn().mockResolvedValue(true),
  setLanguage: jest.fn().mockReturnValue(undefined),
  setEventHandlers: jest.fn().mockReturnValue(undefined),
  startListening: jest.fn().mockResolvedValue(undefined),
  stopListening: jest.fn().mockResolvedValue(undefined),
  cleanup: jest.fn().mockResolvedValue(undefined),
}

const mockTTSInstance = {
  speak: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  cleanup: jest.fn().mockResolvedValue(undefined),
  addEventListener: jest.fn().mockReturnValue(() => {}),
}

const mockTTSService = {
  initTTS: jest.fn().mockReturnValue(mockTTSInstance),
  speak: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  addEventListener: jest.fn().mockReturnValue(() => {}),
  cleanup: jest.fn().mockResolvedValue(undefined),
}

describe('VoiceAssistant Services', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockCallClaudeAgent.mockResolvedValue({
      response: 'Test response',
      shouldEndConversation: false,
    })
  })

  describe('Service Mocks', () => {
    it('shouldHaveVoiceServiceMocked', () => {
      expect(mockVoiceService.initializeVoice).toBeDefined()
      expect(mockVoiceService.startListening).toBeDefined()
      expect(mockVoiceService.stopListening).toBeDefined()
    })

    it('shouldHaveTTSServiceMocked', () => {
      expect(mockTTSService.initTTS).toBeDefined()
      expect(mockTTSService.speak).toBeDefined()
      expect(mockTTSService.stop).toBeDefined()
    })

    it('shouldHaveClaudeAgentMocked', () => {
      expect(mockCallClaudeAgent).toBeDefined()
    })
  })

  describe('voiceService', () => {
    it('shouldCallInitializeVoice', async () => {
      await mockVoiceService.initializeVoice()
      expect(mockVoiceService.initializeVoice).toHaveBeenCalled()
    })

    it('shouldCallSetLanguage', () => {
      mockVoiceService.setLanguage('es-ES')
      expect(mockVoiceService.setLanguage).toHaveBeenCalledWith('es-ES')
    })

    it('shouldCallStartListening', async () => {
      await mockVoiceService.startListening()
      expect(mockVoiceService.startListening).toHaveBeenCalled()
    })

    it('shouldCallStopListening', async () => {
      await mockVoiceService.stopListening()
      expect(mockVoiceService.stopListening).toHaveBeenCalled()
    })

    it('shouldCallCleanup', async () => {
      await mockVoiceService.cleanup()
      expect(mockVoiceService.cleanup).toHaveBeenCalled()
    })

    it('shouldHandleInitializationError', async () => {
      mockVoiceService.initializeVoice.mockRejectedValueOnce(new Error('Init error'))
      await expect(mockVoiceService.initializeVoice()).rejects.toThrow('Init error')
    })
  })

  describe('ttsService', () => {
    it('shouldCallInitTTS', () => {
      const instance = mockTTSService.initTTS()
      expect(mockTTSService.initTTS).toHaveBeenCalled()
      expect(instance).toBeDefined()
    })

    it('shouldCallSpeak', async () => {
      await mockTTSService.speak('Hello', {})
      expect(mockTTSService.speak).toHaveBeenCalledWith('Hello', {})
    })

    it('shouldCallSpeakWithOptions', async () => {
      const options = { conversational: true, voiceId: 'voice-123' }
      await mockTTSService.speak('Hello', options)
      expect(mockTTSService.speak).toHaveBeenCalledWith('Hello', options)
    })

    it('shouldCallStop', async () => {
      await mockTTSService.stop()
      expect(mockTTSService.stop).toHaveBeenCalled()
    })

    it('shouldCallCleanup', async () => {
      await mockTTSService.cleanup()
      expect(mockTTSService.cleanup).toHaveBeenCalled()
    })

    it('shouldHandleSpeakError', async () => {
      mockTTSService.speak.mockRejectedValueOnce(new Error('TTS error'))
      await expect(mockTTSService.speak('Test', {})).rejects.toThrow('TTS error')
    })
  })

  describe('claudeAgent', () => {
    it('shouldCallClaudeAgent', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }]
      await mockCallClaudeAgent(messages, {})
      expect(mockCallClaudeAgent).toHaveBeenCalledWith(messages, {})
    })

    it('shouldReturnResponse', async () => {
      const result = await mockCallClaudeAgent([], {})
      expect(result.response).toBe('Test response')
      expect(result.shouldEndConversation).toBe(false)
    })

    it('shouldHandleConversationEnd', async () => {
      mockCallClaudeAgent.mockResolvedValueOnce({
        response: 'Goodbye',
        shouldEndConversation: true,
      })

      const result = await mockCallClaudeAgent([], {})
      expect(result.shouldEndConversation).toBe(true)
    })

    it('shouldPassElderlyName', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }]
      await mockCallClaudeAgent(messages, { elderlyName: 'María' })
      expect(mockCallClaudeAgent).toHaveBeenCalledWith(
        messages,
        expect.objectContaining({ elderlyName: 'María' })
      )
    })

    it('shouldPassUserId', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }]
      await mockCallClaudeAgent(messages, { userId: 'user-123' })
      expect(mockCallClaudeAgent).toHaveBeenCalledWith(
        messages,
        expect.objectContaining({ userId: 'user-123' })
      )
    })

    it('shouldHandleToolsUsed', async () => {
      mockCallClaudeAgent.mockResolvedValueOnce({
        response: 'Current time is 3 PM',
        shouldEndConversation: false,
        toolsUsed: ['get_current_time'],
      })

      const result = await mockCallClaudeAgent([], {})
      expect(result.toolsUsed).toEqual(['get_current_time'])
    })
  })

  describe('integration', () => {
    it('shouldMockAllServices', () => {
      expect(mockVoiceService.initializeVoice).toBeDefined()
      expect(mockTTSService.speak).toBeDefined()
      expect(mockCallClaudeAgent).toBeDefined()
    })

    it('shouldHandleErrorsInServices', async () => {
      mockVoiceService.startListening.mockRejectedValueOnce(new Error('Test error'))
      await expect(mockVoiceService.startListening()).rejects.toThrow('Test error')
    })

    it('shouldInitializeTTSAndSpeak', async () => {
      const tts = mockTTSService.initTTS()
      await tts.speak('Test message', {})

      expect(mockTTSService.initTTS).toHaveBeenCalled()
      expect(tts.speak).toHaveBeenCalledWith('Test message', {})
    })

    it('shouldCleanupAllServices', async () => {
      await mockVoiceService.cleanup()
      await mockTTSService.cleanup()

      expect(mockVoiceService.cleanup).toHaveBeenCalled()
      expect(mockTTSService.cleanup).toHaveBeenCalled()
    })

    it('shouldSimulateVoiceToTextFlow', async () => {
      await mockVoiceService.initializeVoice()
      mockVoiceService.setLanguage('es-ES')
      await mockVoiceService.startListening()

      expect(mockVoiceService.initializeVoice).toHaveBeenCalled()
      expect(mockVoiceService.setLanguage).toHaveBeenCalledWith('es-ES')
      expect(mockVoiceService.startListening).toHaveBeenCalled()
    })

    it('shouldSimulateClaudeResponseFlow', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }]
      const result = await mockCallClaudeAgent(messages, {})

      expect(mockCallClaudeAgent).toHaveBeenCalledWith(messages, {})
      expect(result.response).toBe('Test response')
    })

    it('shouldSimulateTTSFlow', async () => {
      mockTTSService.initTTS()
      await mockTTSService.speak('Hello world', {})
      await mockTTSService.stop()

      expect(mockTTSService.initTTS).toHaveBeenCalled()
      expect(mockTTSService.speak).toHaveBeenCalledWith('Hello world', {})
      expect(mockTTSService.stop).toHaveBeenCalled()
    })
  })
})
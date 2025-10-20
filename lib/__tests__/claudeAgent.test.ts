import {
  callClaudeAgent,
  generateAtoSystemPrompt,
  ATO_SYSTEM_PROMPT,
  Message,
} from '../../services/claudeAgent'

jest.mock('../../services/atoTools', () => ({
  executeAtoTool: jest.fn(),
  formatToolResult: jest.fn(),
  ATO_TOOLS: [
    {
      name: 'get_current_time',
      description: 'Get current time',
      input_schema: { type: 'object', properties: {} },
    },
    {
      name: 'end_conversation',
      description: 'End conversation',
      input_schema: { type: 'object', properties: {} },
    },
  ],
}))

const { executeAtoTool, formatToolResult } = require('../../services/atoTools')

const mockFetch = jest.fn()
global.fetch = mockFetch as any

describe('ClaudeAgent', () => {
  const originalApiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    process.env.EXPO_PUBLIC_CLAUDE_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    if (originalApiKey) {
      process.env.EXPO_PUBLIC_CLAUDE_API_KEY = originalApiKey
    } else {
      delete process.env.EXPO_PUBLIC_CLAUDE_API_KEY
    }
  })

  describe('generateAtoSystemPrompt', () => {
    it('shouldGenerateDefaultPromptWithoutElderlyName', () => {
      const prompt = generateAtoSystemPrompt()

      expect(prompt).toContain('Ato Assistant')
      expect(prompt).toContain('Rioplatense Spanish')
      expect(prompt).toContain('elderly person')
      expect(prompt).not.toContain('About')
    })

    it('shouldGeneratePersonalizedPromptWithElderlyName', () => {
      const elderlyName = 'María'
      const prompt = generateAtoSystemPrompt(elderlyName)

      expect(prompt).toContain('Ato Assistant')
      expect(prompt).toContain(`About ${elderlyName}`)
      expect(prompt).toContain(elderlyName)
    })

    it('shouldIncludeKeyInstructionsInPrompt', () => {
      const prompt = generateAtoSystemPrompt()

      expect(prompt).toContain('BRIEF and CONCISE')
      expect(prompt).toContain('vos')
      expect(prompt).toContain('USE TOOLS')
      expect(prompt).toContain('911')
    })
  })

  describe('ATO_SYSTEM_PROMPT', () => {
    it('shouldBeDefinedConstant', () => {
      expect(ATO_SYSTEM_PROMPT).toBeDefined()
      expect(typeof ATO_SYSTEM_PROMPT).toBe('string')
      expect(ATO_SYSTEM_PROMPT.length).toBeGreaterThan(0)
    })
  })

  describe('callClaudeAgent', () => {
    const mockMessages: Message[] = [{ role: 'user', content: '¿Qué hora es?' }]

    it('shouldThrowErrorWhenApiKeyMissing', async () => {
      delete process.env.EXPO_PUBLIC_CLAUDE_API_KEY

      await expect(callClaudeAgent(mockMessages)).rejects.toThrow()
    })

    it('shouldMakeSuccessfulApiCallWithoutTools', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'Son las 3 de la tarde',
          },
        ],
        stop_reason: 'end_turn',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      })

      const result = await callClaudeAgent(mockMessages)

      expect(result.response).toBe('Son las 3 de la tarde')
      expect(result.shouldEndConversation).toBeFalsy()
      expect(result.toolsUsed).toBeUndefined()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('shouldExecuteToolAndReturnFinalResponse', async () => {
      const mockToolResponse = {
        content: [
          {
            type: 'text',
            text: 'Voy a consultar la hora',
          },
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'get_current_time',
            input: {},
          },
        ],
        stop_reason: 'tool_use',
      }

      const mockFinalResponse = {
        content: [
          {
            type: 'text',
            text: 'Son las 15:30',
          },
        ],
        stop_reason: 'end_turn',
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce(mockToolResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce(mockFinalResponse),
        })

      ;(executeAtoTool as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { time: '15:30' },
      })

      ;(formatToolResult as jest.Mock).mockReturnValueOnce('Current time: 15:30')

      const result = await callClaudeAgent(mockMessages)

      expect(result.response).toBe('Son las 15:30')
      expect(result.toolsUsed).toEqual(['get_current_time'])
      expect(executeAtoTool).toHaveBeenCalledWith('get_current_time', {})
      expect(formatToolResult).toHaveBeenCalledWith('get_current_time', {
        success: true,
        data: { time: '15:30' },
      })
    })

    it('shouldHandleEndConversationTool', async () => {
      const mockToolResponse = {
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'end_conversation',
            input: {},
          },
        ],
        stop_reason: 'tool_use',
      }

      const mockFinalResponse = {
        content: [
          {
            type: 'text',
            text: 'Chau, que tengas buen día',
          },
        ],
        stop_reason: 'end_turn',
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce(mockToolResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce(mockFinalResponse),
        })

      ;(executeAtoTool as jest.Mock).mockResolvedValueOnce({
        success: true,
        shouldEndConversation: true,
      })

      ;(formatToolResult as jest.Mock).mockReturnValueOnce('Conversation ended')

      const result = await callClaudeAgent(mockMessages)

      expect(result.response).toBe('Chau, que tengas buen día')
      expect(result.shouldEndConversation).toBe(true)
      expect(result.toolsUsed).toEqual(['end_conversation'])
    })

    it('shouldInjectUserIdIntoToolInput', async () => {
      const mockToolResponse = {
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'get_user_report',
            input: {},
          },
        ],
        stop_reason: 'tool_use',
      }

      const mockFinalResponse = {
        content: [
          {
            type: 'text',
            text: 'Aquí está tu reporte',
          },
        ],
        stop_reason: 'end_turn',
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce(mockToolResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce(mockFinalResponse),
        })

      ;(executeAtoTool as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { report: 'test' },
      })

      ;(formatToolResult as jest.Mock).mockReturnValueOnce('Report data')

      await callClaudeAgent(mockMessages, { managerId: 'user-123' })

      expect(executeAtoTool).toHaveBeenCalledWith('get_user_report', {
       managerId: "user-123",
     })
    })

    it('shouldUseCustomSystemPrompt', async () => {
      const customPrompt = 'Custom system prompt'

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'Response',
          },
        ],
        stop_reason: 'end_turn',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      })

      await callClaudeAgent(mockMessages, { systemPrompt: customPrompt })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining(customPrompt),
        })
      )
    })

    it('shouldUseElderlyNameInSystemPrompt', async () => {
      const elderlyName = 'María'

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'Hola María',
          },
        ],
        stop_reason: 'end_turn',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      })

      await callClaudeAgent(mockMessages, { elderlyName })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining(elderlyName),
        })
      )
    })

    it('shouldHandleMultipleToolUses', async () => {
      const mockToolResponse = {
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'get_current_time',
            input: {},
          },
          {
            type: 'tool_use',
            id: 'tool-2',
            name: 'get_user_report',
            input: {},
          },
        ],
        stop_reason: 'tool_use',
      }

      const mockFinalResponse = {
        content: [
          {
            type: 'text',
            text: 'Información completa',
          },
        ],
        stop_reason: 'end_turn',
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce(mockToolResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce(mockFinalResponse),
        })

      ;(executeAtoTool as jest.Mock)
        .mockResolvedValueOnce({ success: true, data: { time: '15:30' } })
        .mockResolvedValueOnce({ success: true, data: { report: 'data' } })

      ;(formatToolResult as jest.Mock)
        .mockReturnValueOnce('Time result')
        .mockReturnValueOnce('Report result')

      const result = await callClaudeAgent(mockMessages, { managerId: 'user-123' })

      expect(result.toolsUsed).toEqual(['get_current_time', 'get_user_report'])
      expect(executeAtoTool).toHaveBeenCalledTimes(2)
    })

    it('shouldStopAfterMaxIterations', async () => {
      const mockToolResponse = {
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'get_current_time',
            input: {},
          },
        ],
        stop_reason: 'tool_use',
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockToolResponse),
      })

      ;(executeAtoTool as jest.Mock).mockResolvedValue({
        success: true,
        data: {},
      })

      ;(formatToolResult as jest.Mock).mockReturnValue('Result')

      await expect(callClaudeAgent(mockMessages)).rejects.toThrow()
    })

    it('shouldThrowErrorOnApiFailure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      await expect(callClaudeAgent(mockMessages)).rejects.toThrow()
    })

    it('shouldThrowErrorWhenNoTextContent', async () => {
      const mockResponse = {
        content: [],
        stop_reason: 'end_turn',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      })

      await expect(callClaudeAgent(mockMessages)).rejects.toThrow()
    })

    it('shouldFilterSystemMessagesFromInput', async () => {
      const messagesWithSystem: Message[] = [
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'User message' },
        { role: 'assistant', content: 'Assistant message' },
      ]

      const mockResponse = {
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'end_turn',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      })

      await callClaudeAgent(messagesWithSystem)

      const fetchCall = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)

      expect(requestBody.messages).toHaveLength(2)
      expect(requestBody.messages[0].content).toBe('User message')
      expect(requestBody.messages[1].content).toBe('Assistant message')
    })

    it('shouldIncludeCorrectApiHeaders', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'end_turn',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      })

      await callClaudeAgent(mockMessages)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key',
            'anthropic-version': '2023-06-01',
          },
        })
      )
    })

    it('shouldUseCorrectModelAndParameters', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'end_turn',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      })

      await callClaudeAgent(mockMessages)

      const fetchCall = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)

      expect(requestBody.model).toBe('claude-sonnet-4-5-20250929')
      expect(requestBody.max_tokens).toBe(2024)
      expect(requestBody.temperature).toBe(0.8)
    })

    it('shouldHandleFetchException', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(callClaudeAgent(mockMessages)).rejects.toThrow()
    })
  })
})
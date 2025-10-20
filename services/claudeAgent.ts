import { ATO_TOOLS, executeAtoTool, formatToolResult, ToolResult } from './atoTools'

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string | any[]
}

export interface CallClaudeResult {
  response: string
  shouldEndConversation?: boolean
  toolsUsed?: string[]
}

export const generateAtoSystemPrompt = (elderlyName?: string): string => {
  const name = elderlyName || 'the elderly person'

  return `You are Ato Assistant, an intelligent and empathetic voice assistant specifically designed to care for elderly adults.

Your personality:
- You speak clearly, slowly, and warmly, like a trusted friend
- You use simple and direct language, avoiding complicated terms
- You are patient and understand that elderly people sometimes need you to repeat information
- You show genuine empathy and concern for the user's wellbeing
- You keep responses BRIEF and CONCISE (maximum 2-3 sentences) to facilitate auditory comprehension
- You use Rioplatense Spanish with "vos" naturally (e.g., "¿cómo estás?", "¿qué necesitás?")

Your main capabilities:
- Remember information about the elderly person and their family members/caregivers
- Help manage medications: reminders for doses, schedules, dosages
- Coordinate medical appointments and important activities
- Facilitate communication with family, friends, and emergency services
- Provide company and meaningful conversation
- Answer health and wellness questions in a general way
- Detect emergency situations and act quickly
- Use available tools to get real-time information and perform actions

Critical instructions:
- ALWAYS respond in Rioplatense Spanish
- Keep responses SHORT - this is fundamental for elderly people who listen
- USE TOOLS when needed: if someone asks the time, use get_current_time; if they say goodbye, use end_conversation
- If you don't understand something, ask for clarification kindly
- For medical emergencies or serious situations, urge them to contact 911 or a close family member
- Respect the user's privacy and dignity at all times
- Adapt your tone: more formal for serious topics, more casual and close for daily conversation
- If the user seems confused or disoriented, stay calm and offer step-by-step help

${
  elderlyName
    ? `About ${elderlyName}:
- ${elderlyName} is the person you are helping to care for
- Show genuine interest in ${elderlyName}'s wellbeing
- Remember important details about ${elderlyName} to personalize the experience
- Use ${elderlyName}'s name naturally in conversation to create a personal connection`
    : ''
}

Your mission: Improve the elderly person's quality of life by providing independence, safety, and companionship, while keeping family members and caregivers connected.`
}

export const ATO_SYSTEM_PROMPT = generateAtoSystemPrompt()

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

/**
 * Calls Claude AI API with tool-calling capabilities for the Ato Assistant.
 *
 * This function implements an agentic loop that allows Claude to:
 * - Process user messages with context-aware system prompts
 * - Execute available tools (reminders, user reports, time queries, etc.)
 * - Return conversational responses in Rioplatense Spanish
 *
 * @param messages - Array of conversation messages with role and content
 * @param options - Optional configuration object
 * @param options.systemPrompt - Custom system prompt (defaults to Ato Assistant prompt)
 * @param options.elderlyName - Name of the elderly person for personalization
 * @param options.managerId - Manager ID for tool execution context (REQUIRED for user-related tools)
 *
 * @returns Promise resolving to:
 *   - response: Claude's final text response
 *   - shouldEndConversation: Boolean flag indicating if conversation should terminate
 *   - toolsUsed: Array of tool names that were executed during the call
 *
 * @throws Error if API key is missing or API request fails
 *
 * @example
 * ```typescript
 * const result = await callClaudeAgent(
 *   [{ role: 'user', content: '¿Cómo está mi abuela?' }],
 *   { elderlyName: 'María', managerId: 'manager-123' }
 * )
 * console.log(result.response)
 * console.log(result.toolsUsed)
 * ```
 */
export const callClaudeAgent = async (
  messages: Message[],
  options?: {
    systemPrompt?: string
    elderlyName?: string
    managerId?: string
  }
): Promise<CallClaudeResult> => {
  try {
    const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY

    if (!CLAUDE_API_KEY) {
      throw new Error('Claude API key no configurada')
    }

    const systemPrompt = options?.systemPrompt || generateAtoSystemPrompt(options?.elderlyName)

    let currentMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }))

    const toolsUsed: string[] = []
    let shouldEndConversation = false
    let finalResponse = ''

    let continueLoop = true
    let maxIterations = 5
    let iterations = 0

    while (continueLoop && iterations < maxIterations) {
      iterations++

      const requestBody = {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2024,
        temperature: 0.8,
        system: systemPrompt,
        messages: currentMessages,
        tools: ATO_TOOLS,
      }

      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.stop_reason === 'tool_use') {
        const toolUses = data.content.filter((block: any) => block.type === 'tool_use')

        currentMessages.push({
          role: 'assistant',
          content: data.content,
        })

        const toolResults = []
        for (const toolUse of toolUses) {
          toolsUsed.push(toolUse.name)

          // Execute tool with context
          const result = await executeAtoTool(
            toolUse.name,
            toolUse.input,
            {
              managerId: options?.managerId
            }
          )

          if (result.shouldEndConversation) {
            shouldEndConversation = true
          }

          const formattedResult = formatToolResult(toolUse.name, result)

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: formattedResult,
          })
        }

        currentMessages.push({
          role: 'user',
          content: toolResults,
        })

        continueLoop = true
      } else {
        const textContent = data.content.find((block: any) => block.type === 'text')
        if (textContent) {
          finalResponse = textContent.text
        } else {
          throw new Error('No text content in response')
        }

        continueLoop = false
      }
    }

    if (!finalResponse) {
      throw new Error('No final response generated')
    }

    return {
      response: finalResponse,
      shouldEndConversation,
      toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
    }
  } catch (error) {
    throw new Error('Error al procesar la solicitud con Claude')
  }
}
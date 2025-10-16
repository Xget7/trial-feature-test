import { ATO_TOOLS, executeAtoTool, formatToolResult, ToolResult } from './ato-tools'

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string | any[] // Allow array for tool_use/tool_result
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

const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

export const callClaudeAgent = async (
  messages: Message[],
  options?: {
    systemPrompt?: string
    elderlyName?: string
    userId?: string // For tool execution context
  }
): Promise<CallClaudeResult> => {
  try {
    console.log('[AI Agent] 🤖 Calling Claude API with tool calling')
    console.log('[AI Agent] Messages count:', messages.length)
    console.log('[AI Agent] Elderly name:', options?.elderlyName || 'not specified')
    console.log('[AI Agent] User ID:', options?.userId || 'not specified')

    if (!CLAUDE_API_KEY) {
      console.error('[AI Agent] ❌ No API key found')
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

    // Tool calling loop - may need multiple rounds
    let continueLoop = true
    let maxIterations = 5 // Prevent infinite loops
    let iterations = 0

    while (continueLoop && iterations < maxIterations) {
      iterations++
      console.log(`[AI Agent] 🔄 Tool calling iteration ${iterations}`)

      const requestBody = {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        temperature: 0.8,
        system: systemPrompt,
        messages: currentMessages,
        tools: ATO_TOOLS, // ✅ Enable tool calling
      }

      console.log('[AI Agent] 📡 Sending request to Claude...')

      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('[AI Agent] Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[AI Agent] ❌ API Error:', response.status, errorText)
        throw new Error(`Claude API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('[AI Agent] ✅ Response received')
      console.log('[AI Agent] Stop reason:', data.stop_reason)

      // Check if Claude wants to use tools
      if (data.stop_reason === 'tool_use') {
        console.log('[AI Agent] 🔧 Claude wants to use tools')

        // Find all tool_use blocks in the response
        const toolUses = data.content.filter((block: any) => block.type === 'tool_use')
        console.log(`[AI Agent] Found ${toolUses.length} tool use(s)`)

        // Add assistant's response with tool_use to messages
        currentMessages.push({
          role: 'assistant',
          content: data.content,
        })

        // Execute all tools and collect results
        const toolResults = []
        for (const toolUse of toolUses) {
          console.log(`[AI Agent] Executing tool: ${toolUse.name}`)
          toolsUsed.push(toolUse.name)

          // Add userId to tool input if needed and not provided
          const toolInput = { ...toolUse.input }
          if (
            (toolUse.name === 'get_user_report' || toolUse.name === 'create_reminder') &&
            !toolInput.user_id &&
            options?.userId
          ) {
            toolInput.user_id = options.userId
          }

          const result = await executeAtoTool(toolUse.name, toolInput)

          // Check if we should end the conversation
          if (result.shouldEndConversation) {
            shouldEndConversation = true
          }

          // Format result for Claude
          const formattedResult = formatToolResult(toolUse.name, result)

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: formattedResult,
          })
        }

        // Add tool results to messages
        currentMessages.push({
          role: 'user',
          content: toolResults,
        })

        // Continue loop to get Claude's final response
        continueLoop = true
      } else {
        // No more tools to use, get final text response
        console.log('[AI Agent] 📝 Getting final text response')

        const textContent = data.content.find((block: any) => block.type === 'text')
        if (textContent) {
          finalResponse = textContent.text
          console.log('[AI Agent] Response text length:', finalResponse.length)
        } else {
          console.error('[AI Agent] ❌ No text content in response')
          throw new Error('No text content in response')
        }

        continueLoop = false
      }
    }

    if (iterations >= maxIterations) {
      console.warn('[AI Agent] ⚠️ Max iterations reached')
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
    console.error('[AI Agent] ❌ Fatal error:', error)
    throw new Error('Error al procesar la solicitud con Claude')
  }
}

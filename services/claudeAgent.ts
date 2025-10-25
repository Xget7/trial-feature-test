import { ATO_TOOLS, executeAtoTool, formatToolResult, ToolResult, getToolLoadingMessage } from './atoTools'
import { i18n } from '../lib/i18n'

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string | any[]
}

export interface CallClaudeResult {
  response: string
  shouldEndConversation?: boolean
  toolsUsed?: string[]
  loadingMessage?: string
}

/**
 * Generate Ato system prompt using i18n translations
 * @param elderlyName - Optional name of the elderly person for personalization
 * @returns System prompt in the current locale
 *
 * Note: Currently hardcoded to Spanish ('es').
 * To use dynamic locale, replace 'es' with getCurrentLanguage()
 */
export const generateAtoSystemPrompt = (elderlyName?: string): string => {
  // 🔒 HARDCODED TO SPANISH - Change to getCurrentLanguage() for dynamic locale
  const locale = 'es'

  // Helper function to get translation in specific locale
  const t = (key: string, params?: any): string => {
    const previousLocale = i18n.locale
    i18n.locale = locale
    const translation = i18n.t(key, params)
    i18n.locale = previousLocale
    return translation
  }

  const name = elderlyName || (locale === 'es' ? 'el adulto mayor' : 'the elderly person')

  const personality = `${t('claudeAgent.personality.intro')}

PERSONALIDAD:
- ${t('claudeAgent.personality.tone')}
- ${t('claudeAgent.personality.language')}
- ${t('claudeAgent.personality.empathy')}
- ${t('claudeAgent.personality.brevity')}
- ${t('claudeAgent.personality.dialect')}`

  const capabilities = `
${t('claudeAgent.capabilities.title')}:
- ${t('claudeAgent.capabilities.memory', { name })}
- ${t('claudeAgent.capabilities.health')}
- ${t('claudeAgent.capabilities.communication')}
- ${t('claudeAgent.capabilities.tools')}`

  const criticalInstructions = `
${t('claudeAgent.criticalInstructions.title')}:
- ${t('claudeAgent.criticalInstructions.languageRule')}
- ${t('claudeAgent.criticalInstructions.brevityRule')}
- ${t('claudeAgent.criticalInstructions.toolUsage')}
- ${t('claudeAgent.criticalInstructions.clarification')}
- ${t('claudeAgent.criticalInstructions.emergencies')}
- ${t('claudeAgent.criticalInstructions.privacy')}
- ${t('claudeAgent.criticalInstructions.toneAdaptation')}`

  const personalization = elderlyName
    ? `
Sobre ${elderlyName}:
- ${t('claudeAgent.personalization.interest')}
- ${t('claudeAgent.personalization.remember')}
- ${t('claudeAgent.personalization.useName')}`
    : ''

  const mission = `
${t('claudeAgent.mission')}`

  return `${personality}${capabilities}${criticalInstructions}${personalization}${mission}`
}

export const ATO_SYSTEM_PROMPT = generateAtoSystemPrompt()

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

export type ClaudeModel = 
  | 'claude-sonnet-4-5'              // Latest Sonnet 4.5
  | 'claude-haiku-4-5'               // Latest Haiku 4.5  
  | 'claude-opus-4-1'                // Latest Opus 4.1
  | 'claude-sonnet-3-7'              // Latest Sonnet 3.7
  
  | 'claude-3-5-sonnet-20241022'     
  | 'claude-3-5-haiku-20241022'
  | 'claude-3-5-sonnet-20240620'
  
  | 'claude-3-opus-20240229'
  | 'claude-3-sonnet-20240229'
  | 'claude-3-haiku-20240307'

const DEFAULT_MODEL: ClaudeModel = 'claude-haiku-4-5'
/**
 * Calls Claude AI API with tool-calling capabilities for the Ato Assistant.
 *
 * This function implements an agentic loop that allows Claude to:
 * - Process user messages with context-aware system prompts
 * - Execute available tools (reminders, user reports, time queries, etc.)
 * - Return conversational responses in Rioplatense Spanish
 * - Provide loading messages while processing long-running tools
 *
 * @param messages - Array of conversation messages with role and content
 * @param options - Optional configuration object
 * @param options.systemPrompt - Custom system prompt (defaults to Ato Assistant prompt)
 * @param options.elderlyName - Name of the elderly person for personalization
 * @param options.managerId - Manager ID for tool execution context (REQUIRED for user-related tools)
 * @param options.model - Claude model to use (default: claude-3-5-sonnet-20241022)
 * @param options.onToolStart - Callback when a tool starts executing (for loading messages)
 *
 * @returns Promise resolving to:
 *   - response: Claude's final text response
 *   - shouldEndConversation: Boolean flag indicating if conversation should terminate
 *   - toolsUsed: Array of tool names that were executed during the call
 *   - loadingMessage: Message to speak while processing (if tools are being executed)
 *
 * @throws Error if API key is missing or API request fails
 *
 * @example
 * ```typescript
 * const result = await callClaudeAgent(
 *   [{ role: 'user', content: '¿Cómo está mi abuela?' }],
 *   { 
 *     elderlyName: 'María', 
 *     managerId: 'manager-123',
 *     model: 'claude-3-5-haiku-20241022',  // Use fastest model
 *     onToolStart: (toolName) => {
 *       console.log('Starting tool:', toolName)
 *     }
 *   }
 * )
 * console.log(result.response)
 * console.log(result.loadingMessage)  // "Dame un segundo que consulto..."
 * ```
 */
export const callClaudeAgent = async (
  messages: Message[],
  options?: {
    systemPrompt?: string
    elderlyName?: string
    managerId?: string
    model?: ClaudeModel
    onToolStart?: (toolName: string, loadingMessage?: string) => void
  }
): Promise<CallClaudeResult> => {
  try {
    const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY

    if (!CLAUDE_API_KEY) {
      throw new Error('Claude API key no configurada')
    }

    const systemPrompt = options?.systemPrompt || generateAtoSystemPrompt(options?.elderlyName)
    const model = options?.model || DEFAULT_MODEL

    let currentMessages = messages
      .filter(m => m.role !== 'system')
      .slice(-6)  // Only keep recent context
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }))

    const toolsUsed: string[] = []
    let shouldEndConversation = false
    let finalResponse = ''
    let loadingMessage: string | undefined

    let continueLoop = true
    let maxIterations = 5
    let iterations = 0

    while (continueLoop && iterations < maxIterations) {
      iterations++

      const requestBody = {
        model,  
        max_tokens: 1024,
        temperature: 0.8,
        system: systemPrompt,
        messages: currentMessages,
        tools: ATO_TOOLS,
      }

      console.log(`[CLAUDE] Calling Claude (model: ${model}, iteration: ${iterations})`)
      const startTime = Date.now()

      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      })

      const elapsed = Date.now() - startTime
      console.log(`[CLAUDE] API call took ${elapsed}ms`)

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

          // Get and trigger loading message if available
          const toolLoadingMsg = getToolLoadingMessage(toolUse.name)
          if (toolLoadingMsg) {
            loadingMessage = toolLoadingMsg
            if (options?.onToolStart) {
              options.onToolStart(toolUse.name, toolLoadingMsg)
            }
            console.log(`[CLAUDE] Loading message: "${toolLoadingMsg}"`)
          }

          console.log(`[CLAUDE] Executing tool: ${toolUse.name}`)
          const toolStartTime = Date.now()

          // Execute tool with context
          const result = await executeAtoTool(
            toolUse.name,
            toolUse.input,
            {
              managerId: options?.managerId
            }
          )

          const toolElapsed = Date.now() - toolStartTime
          console.log(`[CLAUDE] Tool ${toolUse.name} took ${toolElapsed}ms`)

          if (result.shouldEndConversation) {
            shouldEndConversation = true

            if (toolUse.name === 'end_conversation' && toolUse.input.farewell_message) {
              finalResponse = toolUse.input.farewell_message
              continueLoop = false
              break
            }
          }

          const formattedResult = formatToolResult(toolUse.name, result)

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: formattedResult,
          })
        }

        // Only continue the loop if we haven't set a final response
        if (!finalResponse) {
          currentMessages.push({
            role: 'user',
            content: toolResults,
          })
          continueLoop = true
        }
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
      loadingMessage,  
    }
  } catch (error) {
    console.error('[CLAUDE] Error:', error)
    throw new Error('Error al procesar la solicitud con Claude')
  }
}

export { DEFAULT_MODEL }
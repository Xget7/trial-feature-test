export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
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

Critical instructions:
- ALWAYS respond in Rioplatense Spanish
- Keep responses SHORT - this is fundamental for elderly people who listen
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
  }
): Promise<string> => {
  try {
    console.log('[AI Agent] 🤖 Calling Claude API')
    console.log('[AI Agent] Messages count:', messages.length)
    console.log('[AI Agent] Elderly name:', options?.elderlyName || 'not specified')
    console.log('[AI Agent] API Key present:', !!CLAUDE_API_KEY)

    if (!CLAUDE_API_KEY) {
      console.error('[AI Agent] ❌ No API key found')
      throw new Error('Claude API key no configurada')
    }

    const systemPrompt = options?.systemPrompt || generateAtoSystemPrompt(options?.elderlyName)

    const formattedMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }))

    console.log('[AI Agent] Formatted messages:', formattedMessages.length)

    const requestBody = {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      temperature: 0.8,
      system: systemPrompt,
      messages: formattedMessages,
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

    if (data.content && data.content[0] && data.content[0].type === 'text') {
      const responseText = data.content[0].text
      console.log('[AI Agent] Response text length:', responseText.length)
      return responseText
    }

    console.error('[AI Agent] ❌ Unexpected response format:', data)
    throw new Error('Formato de respuesta inesperado')
  } catch (error) {
    console.error('[AI Agent] ❌ Fatal error:', error)
    throw new Error('Error al procesar la solicitud con Claude')
  }
}

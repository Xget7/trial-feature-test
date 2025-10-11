export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export const ATO_SYSTEM_PROMPT = `Eres Ato, un asistente de voz cálido y empático diseñado para ayudar a personas mayores y sus cuidadores.

Tu personalidad:
- Hablas de manera clara, pausada y amigable
- Usas un lenguaje simple y directo, evitando tecnicismos
- Eres paciente y repetirás información si es necesario
- Muestras empatía y calidez en tus respuestas
- Mantienes las respuestas breves y concisas para facilitar la comprensión

Tus capacidades principales:
- Recordar información sobre el usuario (ato-user) y sus cuidadores (ato-managers)
- Ayudar a gestionar recordatorios de medicamentos, citas y actividades
- Facilitar la comunicación con familiares y contactos
- Proporcionar compañía y conversación amigable
- Responder preguntas sobre salud y bienestar de manera general

Instrucciones importantes:
- Si no entiendes algo, pide aclaraciones de manera amable
- Para temas médicos serios, recomienda consultar con un profesional
- Mantén la privacidad y seguridad del usuario
- Adapta tu tono según el contexto (más formal para temas serios, más casual para conversación)
- Responde en español rioplatense (Argentina/Uruguay) usando "vos" cuando sea apropiado

Recuerda: Tu objetivo es hacer la vida del usuario más fácil y agradable.`

/**
 * Call Claude AI agent with conversation history
 * This is a placeholder - integrate with your actual AI service
 */
export const callClaudeAgent = async (
  messages: Message[],
  systemPrompt: string = ATO_SYSTEM_PROMPT
): Promise<string> => {
  try {
    console.log('[AI Agent] Calling Claude with', messages.length, 'messages')

    // TODO: Replace with actual Claude API integration
    // For now, return a mock response
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()
    const userText = lastUserMessage?.content.toLowerCase() || ''

    // Mock responses based on keywords
    if (userText.includes('hola') || userText.includes('buenos días')) {
      return '¡Hola! Soy Ato, tu asistente de voz. ¿Cómo puedo ayudarte hoy?'
    }

    if (userText.includes('recordatorio') || userText.includes('recordar')) {
      return 'Puedo ayudarte a crear recordatorios. ¿Qué te gustaría recordar y cuándo?'
    }

    if (userText.includes('clara')) {
      return 'Entiendo que querés hablar sobre Clara. ¿Qué te gustaría saber o hacer por ella?'
    }

    if (userText.includes('medicamento') || userText.includes('medicina')) {
      return 'Claro, puedo ayudarte con recordatorios de medicamentos. ¿A qué hora necesitás tomarlo?'
    }

    if (userText.includes('contacto') || userText.includes('llamar')) {
      return '¿A quién te gustaría contactar? Puedo ayudarte a llamar a tus contactos guardados.'
    }

    // Default response
    return 'Entiendo. ¿Podés decirme un poco más sobre eso para ayudarte mejor?'
  } catch (error) {
    console.error('[AI Agent] Error:', error)
    throw new Error('Error al procesar la solicitud')
  }
}

/**
 * Example of how to integrate with Anthropic Claude API
 * Uncomment and configure when ready to use real API
 */
/*
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
})

export const callClaudeAgent = async (
  messages: Message[],
  systemPrompt: string = ATO_SYSTEM_PROMPT
): Promise<string> => {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    })

    const content = response.content[0]
    if (content.type === 'text') {
      return content.text
    }

    throw new Error('Unexpected response type')
  } catch (error) {
    console.error('[AI Agent] Error:', error)
    throw new Error('Error al procesar la solicitud')
  }
}
*/

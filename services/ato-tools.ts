import { atoApi } from '../lib/ato-api'
import { t } from '../lib/i18n'
/**
 * Tool definitions for Claude API
 * These define the actions that Ato can perform
 */
export interface Tool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

/**
 * Available tools that Ato can use
 */
export const ATO_TOOLS: Tool[] = [
  {
    name: 'get_current_time',
    description:
      'Obtiene la hora y fecha actual del dispositivo. Usa esto cuando el usuario pregunta qué hora es o qué día es hoy.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'end_conversation',
    description:
      'Termina la conversación con el usuario. Usa esto cuando el usuario dice adiós, chau, nos vemos, o indica que quiere terminar la conversación.',
    input_schema: {
      type: 'object',
      properties: {
        farewell_message: {
          type: 'string',
          description: 'Un mensaje breve y cálido de despedida para el usuario',
        },
      },
      required: ['farewell_message'],
    },
  },
  {
    name: 'get_user_report',
    description:
      'Obtiene el reporte completo de un usuario, incluyendo contactos recientes, recordatorios activos y próximos, y actividad reciente. Usa esto cuando preguntan cómo está el usuario, qué ha estado haciendo, o para obtener información general sobre su estado.',
    input_schema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'El ID del usuario del cual obtener el reporte',
        },
      },
      required: ['user_id'],
    },
  },
  {
    name: 'create_reminder',
    description:
      'Crea un recordatorio para el usuario. Usa esto cuando el usuario pide que le recuerdes algo.',
    input_schema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'El ID del usuario para quien crear el recordatorio',
        },
        task: {
          type: 'string',
          description: 'La tarea o recordatorio que se debe enviar',
        },
        scheduled_for: {
          type: 'string',
          description: 'Fecha y hora en formato ISO 8601 (ej: 2025-01-15T14:30:00Z)',
        },
      },
      required: ['user_id', 'task', 'scheduled_for'],
    },
  },
]

/**
 * Tool execution results
 */
export interface ToolResult {
  success: boolean
  data?: any
  error?: string
  shouldEndConversation?: boolean
}

/**
 * Execute a tool based on its name and input
 */
export const executeAtoTool = async (
  toolName: string,
  toolInput: Record<string, any>
): Promise<ToolResult> => {
  console.log(`[ATO TOOLS] 🔧 Executing tool: ${toolName}`)
  console.log(`[ATO TOOLS] Input:`, toolInput)

  try {
    switch (toolName) {
      case 'get_current_time':
        return await getCurrentTime()

      case 'end_conversation':
        return await endConversation(toolInput.farewell_message)

      case 'get_user_report':
        return await getUserReport(toolInput.user_id)

      case 'create_reminder':
        return await createReminder(toolInput.user_id, toolInput.task, toolInput.scheduled_for)

      default:
        console.error(`[ATO TOOLS] ❌ Unknown tool: ${toolName}`)
        return {
          success: false,
          error: `Herramienta desconocida: ${toolName}`,
        }
    }
  } catch (error) {
    console.error(`[ATO TOOLS] ❌ Error executing ${toolName}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Tool implementations
 */

async function getCurrentTime(): Promise<ToolResult> {
  const now = new Date()
  const timeString = now.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const dateString = now.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  console.log(`[ATO TOOLS] ⏰ Current time: ${timeString} - ${dateString}`)

  return {
    success: true,
    data: {
      time: timeString,
      date: dateString,
      timestamp: now.toISOString(),
    },
  }
}

async function endConversation(farewellMessage: string): Promise<ToolResult> {
  console.log(`[ATO TOOLS] 👋 Ending conversation: ${farewellMessage}`)

  return {
    success: true,
    data: {
      message: farewellMessage,
    },
    shouldEndConversation: true,
  }
}

async function getUserReport(userId: string): Promise<ToolResult> {
  console.log(`[ATO TOOLS] 📊 Getting report for user: ${userId}`)

  try {
    const report = await atoApi.getUserReport(userId)

    console.log(`[ATO TOOLS] ✅ Report received:`, {
      total_contacts: report.summary.total_contacts,
      total_reminders: report.summary.total_reminders,
      active_reminders: report.summary.active_reminders,
    })

    return {
      success: true,
      data: report,
    }
  } catch (error) {
    console.error(`[ATO TOOLS] ❌ Error getting report:`, error)
    return {
      success: false,
      error: 'No pude obtener el reporte del usuario',
    }
  }
}

async function createReminder(
  userId: string,
  task: string,
  scheduledFor: string
): Promise<ToolResult> {
  console.log(`[ATO TOOLS] 📝 Creating reminder:`, { userId, task, scheduledFor })

  try {
    // Mockeado
    const reminder = {
      id: `reminder-${Date.now()}`,
      user_id: userId,
      task,
      scheduled_for: scheduledFor,
      status: 'PENDING',
    }

    console.log(`[ATO TOOLS] ✅ Reminder created:`, reminder.id)

    return {
      success: true,
      data: reminder,
    }
  } catch (error) {
    console.error(`[ATO TOOLS] ❌ Error creating reminder:`, error)
    return {
      success: false,
      error: 'No pude crear el recordatorio',
    }
  }
}

/**
 * Format tool result for Claude
 */
export const formatToolResult = (toolName: string, result: ToolResult): string => {
  if (!result.success) {
    return `${t('tools.error')}: ${result.error}`
  }

  switch (toolName) {
    case 'get_current_time':
      return `${t('tools.getCurrentTime.currentTime')}: ${result.data.time}\n${t(
        'tools.getCurrentTime.date'
      )}: ${result.data.date}`

    case 'end_conversation':
      return `${t('tools.endConversation.ended')}: "${result.data.message}"`

    case 'get_user_report':
      const report = result.data
      return `${t('tools.getUserReport.title')}:
- ${t('tools.getUserReport.totalContacts')}: ${report.summary.total_contacts}
- ${t('tools.getUserReport.activeReminders')}: ${report.summary.active_reminders}
- ${t('tools.getUserReport.completedReminders')}: ${report.summary.completed_reminders}
- ${t('tools.getUserReport.recentActivity')}: ${report.recent_activity.length} eventos
- ${t('tools.getUserReport.upcomingReminders')}: ${report.upcoming_reminders.length}`

    case 'create_reminder':
      return `${t('tools.createReminder.success')}: "${result.data.task}" ${t(
        'tools.createReminder.for'
      )} ${result.data.scheduled_for}`

    default:
      return JSON.stringify(result.data)
  }
}

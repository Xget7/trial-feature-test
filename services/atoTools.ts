import { atoApi } from '../lib/atoApi'
import { t } from '../lib/i18n'

export interface Tool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

export const ATO_TOOLS: Tool[] = [
  {
    name: 'get_current_time',
    description:
      'Gets the current time and date from the device. Use this when the manager asks what time it is or what day is today.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'end_conversation',
    description:
      'Ends the conversation with the manager. Use this when the manager says goodbye, bye, see you, or indicates they want to end the conversation.',
    input_schema: {
      type: 'object',
      properties: {
        farewell_message: {
          type: 'string',
          description: 'A brief and warm goodbye message for the manager',
        },
      },
      required: ['farewell_message'],
    },
  },
  {
    name: 'get_user_report',
    description:
      'Gets a complete report about an elderly user (the manager\'s family member), including recent contacts, active and upcoming reminders, and recent activity. Use this when the manager asks how their elderly family member is doing, what they have been doing, or to get general information about their status. The "user" refers to the elderly person being cared for, not the manager.',
    input_schema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'The ID of the elderly user (family member) to get the report for',
        },
      },
      required: ['user_id'],
    },
  },
  {
    name: 'create_reminder',
    description:
      'Creates a reminder for the elderly user. Use this when the manager asks to remind their elderly family member about something. The reminder will be sent to the elderly person, not to the manager.',
    input_schema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'The ID of the elderly user (family member) to create the reminder for',
        },
        manager_id: {
          type: 'string',
          description: 'The ID of the manager creating the reminder',
        },
        task: {
          type: 'string',
          description: 'The task or reminder to be sent to the elderly user',
        },
        scheduled_for: {
          type: 'string',
          description: 'Date and time in ISO 8601 format (e.g., 2025-01-15T14:30:00Z)',
        },
      },
      required: ['user_id', 'manager_id', 'task', 'scheduled_for'],
    },
  },
]

export interface ToolResult {
  success: boolean
  data?: any
  error?: string
  shouldEndConversation?: boolean
}

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
        return await createReminder(
          toolInput.user_id,
          toolInput.manager_id,
          toolInput.task,
          toolInput.scheduled_for
        )

      default:
        console.error(`[ATO TOOLS] ❌ Unknown tool: ${toolName}`)
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
        }
    }
  } catch (error) {
    console.error(`[ATO TOOLS] ❌ Error executing ${toolName}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

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
      error: 'Could not get user report',
    }
  }
}

async function createReminder(
  userId: string,
  managerId: string,
  task: string,
  scheduledFor: string
): Promise<ToolResult> {
  console.log(`[ATO TOOLS] 📝 Creating reminder:`, { userId, managerId, task, scheduledFor })

  try {
    const reminder = await atoApi.createReminder({
      user_id: userId,
      manager_id: managerId,
      task,
      scheduled_for: scheduledFor,
      rrule: null,
      status: 'PENDING',
      last_sent_at: null,
      attempts: 0,
    })

    if (!reminder) {
      return {
        success: false,
        error: 'Could not create reminder',
      }
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
      error: 'Could not create reminder',
    }
  }
}

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
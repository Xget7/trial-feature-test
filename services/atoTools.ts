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
      'Gets a complete report about an elderly user (the manager\'s family member), including recent contacts, active and upcoming reminders, and recent activity. Use this when the manager asks how their elderly family member is doing, what they have been doing, or to get general information about their status. If the manager mentions a specific name (e.g., "my grandpa John", "my mom Maria"), include that name in the user_name parameter.',
    input_schema: {
      type: 'object',
      properties: {
        user_name: {
          type: 'string',
          description: 'Optional: The name or nickname of the elderly person if mentioned by the manager (e.g., "grandpa", "mom", "John", "Maria"). Leave empty if no specific person is mentioned.',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_reminder',
    description:
      'Creates a reminder for the elderly user. Use this when the manager asks to remind their elderly family member about something. The reminder will be sent to the elderly person, not to the manager. If a specific person is mentioned by name, include that name.',
    input_schema: {
      type: 'object',
      properties: {
        user_name: {
          type: 'string',
          description: 'Optional: The name or nickname of the elderly person if mentioned. Leave empty to use the currently selected user.',
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
      required: ['task', 'scheduled_for'],
    },
  },
]

export interface ToolResult {
  success: boolean
  data?: any
  error?: string
  shouldEndConversation?: boolean
}


async function selectUserForManager(
  managerId: string,
  userName?: string
): Promise<{ userId: string; userInfo: any } | null> {
  console.log(`[ATO TOOLS] 🔍 Selecting user for manager: ${managerId}, name: ${userName || 'not specified'}`)

  // Get all managed users with selection status
  const managedUsers = await atoApi.getManagedUsersWithSelection(managerId)

  if (managedUsers.length === 0) {
    console.error('[ATO TOOLS] ❌ Manager has no managed users')
    return null
  }

  // If a name was provided, try to match it
  if (userName && userName.trim() !== '') {
    const normalizedSearch = userName.toLowerCase().trim()
    
    // Try to find exact or partial matches
    const matchedUser = managedUsers.find(user => {
      const name = user.name?.toLowerCase() || ''
      const surname = user.surname?.toLowerCase() || ''
      const nickname = user.nickname?.toLowerCase() || ''
      const otherNames = user.other_names?.toLowerCase() || ''
      
      // Check if search term matches any part of the user's names
      return (
        name.includes(normalizedSearch) ||
        surname.includes(normalizedSearch) ||
        nickname.includes(normalizedSearch) ||
        otherNames.includes(normalizedSearch) ||
        normalizedSearch.includes(name) ||
        normalizedSearch.includes(nickname)
      )
    })

    if (matchedUser) {
      console.log(`[ATO TOOLS] ✅ Found matching user: ${matchedUser.name} ${matchedUser.surname}`)
      return {
        userId: matchedUser.id,
        userInfo: matchedUser
      }
    }

  }

  const selectedUser = managedUsers.find(user => user.isSelected)
  
  if (selectedUser) {
    console.log(`[ATO TOOLS] ✅ Using selected user: ${selectedUser.name} ${selectedUser.surname}`)
    return {
      userId: selectedUser.id,
      userInfo: selectedUser
    }
  }

  const firstUser = managedUsers[0]
  
  return {
    userId: firstUser.id,
    userInfo: firstUser
  }
}

export const executeAtoTool = async (
  toolName: string,
  toolInput: Record<string, any>,
  context?: {
    managerId?: string
  }
): Promise<ToolResult> => {
  console.log(`[ATO TOOLS] 🔧 Executing tool: ${toolName}`)
  console.log(`[ATO TOOLS] Input:`, toolInput)
  console.log(`[ATO TOOLS] Context:`, context)

  try {
    switch (toolName) {
      case 'get_current_time':
        return await getCurrentTime()

      case 'end_conversation':
        return await endConversation(toolInput.farewell_message)

      case 'get_user_report':
        if (!context?.managerId) {
          return {
            success: false,
            error: 'Manager ID is required but not provided in context',
          }
        }
        return await getUserReport(context.managerId, toolInput.user_name)

      case 'create_reminder':
        if (!context?.managerId) {
          return {
            success: false,
            error: 'Manager ID is required but not provided in context',
          }
        }
        return await createReminder(
          context.managerId,
          toolInput.user_name,
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

async function getUserReport(
  managerId: string,
  userName?: string
): Promise<ToolResult> {
  console.log(`[ATO TOOLS] 📊 Getting report for manager: ${managerId}, user: ${userName || 'auto-select'}`)

  try {
    const userSelection = await selectUserForManager(managerId, userName)
    
    if (!userSelection) {
      return {
        success: false,
        error: 'No managed users found for this manager',
      }
    }

    const { userId, userInfo } = userSelection

    // Get the report
    const report = await atoApi.getUserReport(userId)

    console.log(`[ATO TOOLS] ✅ Report received for ${userInfo.name}:`, {
      total_contacts: report.summary.total_contacts,
      total_reminders: report.summary.total_reminders,
      active_reminders: report.summary.active_reminders,
    })

    return {
      success: true,
      data: {
        ...report,
        user_info: {
          name: userInfo.name,
          surname: userInfo.surname,
          nickname: userInfo.nickname,
          relationship: userInfo.relationship,
        },
      },
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
  managerId: string,
  userName: string | undefined,
  task: string,
  scheduledFor: string
): Promise<ToolResult> {
  console.log(`[ATO TOOLS] 📝 Creating reminder for manager: ${managerId}, user: ${userName || 'auto-select'}`)

  try {
    const userSelection = await selectUserForManager(managerId, userName)
    
    if (!userSelection) {
      return {
        success: false,
        error: 'No managed users found for this manager',
      }
    }

    const { userId, userInfo } = userSelection

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

    console.log(`[ATO TOOLS] ✅ Reminder created for ${userInfo.name}:`, reminder.id)

    return {
      success: true,
      data: {
        ...reminder,
        user_info: {
          name: userInfo.name,
          surname: userInfo.surname,
          nickname: userInfo.nickname,
          relationship: userInfo.relationship,
        },
      },
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
      const userInfo = report.user_info
      
      let reportStr = `${t('tools.getUserReport.title')} - ${userInfo.name} ${userInfo.surname}`
      
      if (userInfo.relationship) {
        reportStr += ` (${userInfo.relationship})`
      }
      
      reportStr += `:\n\n`
      reportStr += `RESUMEN:\n`
      reportStr += `- Total de contactos: ${report.summary.total_contacts}\n`
      reportStr += `- Total de recordatorios: ${report.summary.total_reminders}\n`
      reportStr += `- Recordatorios activos: ${report.summary.active_reminders}\n`
      
      if (report.summary.pending_reminders !== undefined) {
        reportStr += `- Recordatorios pendientes: ${report.summary.pending_reminders}\n`
      }
      
      reportStr += `- Recordatorios completados: ${report.summary.completed_reminders}\n`
      
      if (report.summary.failed_reminders && report.summary.failed_reminders > 0) {
        reportStr += `- Recordatorios fallidos: ${report.summary.failed_reminders}\n`
      }
      
      if (report.upcoming_reminders && report.upcoming_reminders.length > 0) {
        reportStr += `\nPRÓXIMOS RECORDATORIOS (${report.upcoming_reminders.length}):\n`
        report.upcoming_reminders.slice(0, 5).forEach((reminder: any, index: number) => {
          const scheduledDate = new Date(reminder.scheduled_for)
          const dateStr = scheduledDate.toLocaleDateString('es-AR', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
          reportStr += `  ${index + 1}. "${reminder.task}" - ${dateStr}\n`
        })
      }
      
      if (report.recent_activity && report.recent_activity.length > 0) {
        reportStr += `\nACTIVIDAD RECIENTE (${report.recent_activity.length} eventos)\n`
      }
      
      if (report.recent_reminders && report.recent_reminders.length > 0) {
        reportStr += `\nÚLTIMOS RECORDATORIOS:\n`
        report.recent_reminders.slice(0, 3).forEach((reminder: any, index: number) => {
          reportStr += `  ${index + 1}. "${reminder.task}" (${reminder.status})\n`
        })
      }

      return reportStr

    case 'create_reminder':
      const reminderUserInfo = result.data.user_info
      return `${t('tools.createReminder.success')}: "${result.data.task}" ${t(
        'tools.createReminder.for'
      )} ${reminderUserInfo.name} ${reminderUserInfo.surname} - ${result.data.scheduled_for}`

    default:
      return JSON.stringify(result.data)
  }
}
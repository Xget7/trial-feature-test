import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'
import { MOCK_MANAGERS, MOCK_USERS, MOCK_REPORTS } from './atoApi.mocks'

const TOKEN_KEY = 'ato_api_token'
const USE_MOCK_DATA = process.env.EXPO_PUBLIC_USE_MOCK_API === 'true'

export interface AtoManager {
  id: string
  name: string
  surname: string
  other_names: string | null
  nickname: string
  birthday: string
  location: string
  phone: string
  uses_whatsapp: boolean
  created_at: string
  updated_at: string
  user_id: string | null
  relationship: string | null
}

export interface AtoUser {
  id: string
  name: string
  surname: string
  other_names: string | null
  nickname: string
  birthday: string
  location: string
  phone: string
  created_at: string
  updated_at: string
  profile_picture_url: string | null
  device_id: string | null
  is_active: boolean
}

export interface UserReport {
  user_id: string
  report_generated_at: string
  summary: {
    total_contacts: number
    total_reminders: number
    active_reminders: number
    completed_reminders: number
    // New optional fields - won't break existing code
    failed_reminders?: number
    pending_reminders?: number
  }
  recent_activity: {
    type: string
    timestamp: string
    description: string
  }[]
  upcoming_reminders: {
    id: string
    task: string
    scheduled_for: string
    status?: 'PENDING' | 'SENT' | 'COMPLETED' | 'FAILED'
    created_at?: string
    last_sent_at?: string | null
    attempts?: number
  }[]
  recent_reminders?: {
    id: string
    task: string
    scheduled_for: string
    status: 'PENDING' | 'SENT' | 'COMPLETED' | 'FAILED'
    created_at: string
    last_sent_at: string | null
    attempts: number
  }[]
}

export interface ContactMethod {
  method: 'WHATSAPP' | 'SMS' | 'EMAIL' | 'PHONE'
  value: string
  is_primary: boolean
  description?: string
}

export interface Contact {
  id: string
  user_id: string
  name: string
  surname: string
  relationship: string
  other_names: string[] | null
  birthday: string | null
  location: string | null
  contact_methods: ContactMethod[]
  created_at: string
  updated_at: string
}

// NUEVO: Interface para usuario con relación
export interface UserWithRelation extends AtoUser {
  relationship?: string | null
}

// NUEVO: Interface para selección de manager
export interface ManagerSelectedUser {
  id: string
  manager_id: string
  user_id: string
  created_at: string
  updated_at: string
}

// NUEVO: Interface para Reminders
export interface Reminder {
  id: string
  user_id: string
  manager_id: string
  task: string
  scheduled_for: string
  rrule: string | null
  status: 'PENDING' | 'SENT' | 'COMPLETED' | 'FAILED'
  last_sent_at: string | null
  attempts: number
  created_at?: string
  updated_at?: string
}

class AtoApiService {
  private async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY)
    } catch (error) {
      console.error('Error getting token:', error)
      return null
    }
  }

  private async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token)
    } catch (error) {
      console.error('Error setting token:', error)
    }
  }

  // Authentication
  async setAuthToken(token: string): Promise<void> {
    await this.setToken(token)
  }

  async clearAuthToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY)
    } catch (error) {
      console.error('Error clearing token:', error)
    }
  }

  // Managers API
  async getManagerById(managerId: string): Promise<AtoManager> {
    if (USE_MOCK_DATA) {
      console.log('[Mock mode] Getting manager', managerId)
      await new Promise(resolve => setTimeout(resolve, 500))

      const manager = MOCK_MANAGERS[managerId]
      if (!manager) {
        throw new Error(`Manager with id ${managerId} not found`)
      }
      return manager
    }

    console.log('[Real mode] Getting manager from Supabase', managerId)
    const { data, error } = await supabase.from('managers').select('*').eq('id', managerId).single()

    if (error) {
      console.error('Supabase error getting manager:', error)
      throw new Error(`Manager with id ${managerId} not found`)
    }

    if (!data) {
      throw new Error(`Manager with id ${managerId} not found`)
    }

    return data
  }

  // Users API
  async getUserById(userId: string): Promise<AtoUser> {
    if (USE_MOCK_DATA) {
      console.log('[Mock mode] Getting user', userId)
      await new Promise(resolve => setTimeout(resolve, 500))

      const user = MOCK_USERS[userId]
      if (!user) {
        throw new Error(`User with id ${userId} not found`)
      }
      return user
    }

    console.log('[Real mode] Getting user from Supabase', userId)
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()

    if (error) {
      console.error('Supabase error getting user:', error)
      throw new Error(`User with id ${userId} not found`)
    }

    if (!data) {
      throw new Error(`User with id ${userId} not found`)
    }

    return data
  }

  async getUsersByManagerId(managerId: string): Promise<AtoUser[]> {
    if (USE_MOCK_DATA) {
      console.log('[Mock mode] Getting users for manager', managerId)
      await new Promise(resolve => setTimeout(resolve, 600))

      const manager = MOCK_MANAGERS[managerId]
      if (!manager || !manager.user_id) {
        return []
      }

      const user = MOCK_USERS[manager.user_id]
      return user ? [user] : []
    }

    console.log('[Real mode] Getting users from Supabase for manager', managerId)
    const { data, error } = await supabase
      .from('manager_users')
      .select(
        `
        user_id,
        users (*)
      `
      )
      .eq('manager_id', managerId)

    if (error) {
      console.error('Supabase error getting users:', error)
      return []
    }

    if (!data || data.length === 0) {
      console.log('No users found for manager', managerId)
      return []
    }

    const users = data.map((item: any) => item.users).filter(Boolean)
    return users
  }

  // Manager Selection API
  async getSelectedUser(managerId: string): Promise<UserWithRelation | null> {
    if (USE_MOCK_DATA) {
      console.log('[Mock mode] Getting selected user for manager', managerId)
      await new Promise(resolve => setTimeout(resolve, 400))

      const manager = MOCK_MANAGERS[managerId]
      if (!manager || !manager.user_id) {
        return null
      }

      const user = MOCK_USERS[manager.user_id]
      if (!user) {
        return null
      }

      return {
        ...user,
        relationship: manager.relationship || undefined,
      }
    }

    console.log('[Real mode] Getting selected user from Supabase', managerId)
    try {
      const { data: selection, error: selectionError } = await supabase
        .from('manager_selected_users')
        .select('user_id')
        .eq('manager_id', managerId)
        .maybeSingle()

      if (selectionError) {
        console.error('Error getting selection:', selectionError)
        return null
      }

      if (!selection) {
        console.log('No user selected for manager', managerId)
        return null
      }

      const { data: relationData, error: relationError } = await supabase
        .from('manager_users')
        .select(
          `
          relationship,
          users (*)
        `
        )
        .eq('manager_id', managerId)
        .eq('user_id', selection.user_id)
        .single()

      if (relationError || !relationData) {
        console.error('Error getting user with relation:', relationError)
        return null
      }

      const user = relationData.users as any
      return {
        ...user,
        relationship: relationData.relationship,
      }
    } catch (error) {
      console.error('[AtoAPI] Error getting selected user:', error)
      return null
    }
  }

  async setSelectedUser(managerId: string, userId: string): Promise<boolean> {
    if (USE_MOCK_DATA) {
      console.log('[Mock mode] Setting selected user', { managerId, userId })
      await new Promise(resolve => setTimeout(resolve, 400))
      return true
    }

    console.log('[Real mode] Setting selected user in Supabase', { managerId, userId })
    try {
      const { data: relation, error: relationError } = await supabase
        .from('manager_users')
        .select('user_id')
        .eq('manager_id', managerId)
        .eq('user_id', userId)
        .single()

      if (relationError || !relation) {
        console.error('User does not belong to manager or error:', relationError)
        return false
      }

      const { error } = await supabase.from('manager_selected_users').upsert(
        {
          manager_id: managerId,
          user_id: userId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'manager_id',
        }
      )

      if (error) {
        console.error('Error setting selected user:', error)
        return false
      }

      console.log('Selected user updated successfully')
      return true
    } catch (error) {
      console.error('[AtoAPI] Error setting selected user:', error)
      return false
    }
  }

  async getManagedUsersWithSelection(
    managerId: string
  ): Promise<(UserWithRelation & { isSelected: boolean })[]> {
    if (USE_MOCK_DATA) {
      console.log('[Mock mode] Getting managed users with selection', managerId)
      await new Promise(resolve => setTimeout(resolve, 500))

      const manager = MOCK_MANAGERS[managerId]
      if (!manager || !manager.user_id) {
        return []
      }

      const user = MOCK_USERS[manager.user_id]
      if (!user) {
        return []
      }

      return [
        {
          ...user,
          relationship: manager.relationship,
          isSelected: true,
        },
      ]
    }

    console.log('[Real mode] Getting managed users with selection from Supabase', managerId)
    try {
      const { data: selection } = await supabase
        .from('manager_selected_users')
        .select('user_id')
        .eq('manager_id', managerId)
        .maybeSingle()

      const selectedUserId = selection?.user_id

      const { data, error } = await supabase
        .from('manager_users')
        .select(
          `
          relationship,
          users (*)
        `
        )
        .eq('manager_id', managerId)

      if (error || !data) {
        console.error('Error getting managed users:', error)
        return []
      }

      return data.map(item => {
        const user = item.users as any
        return {
          ...user,
          relationship: item.relationship,
          isSelected: user.id === selectedUserId,
        }
      })
    } catch (error) {
      console.error('[AtoAPI] Error getting managed users:', error)
      return []
    }
  }

  // NUEVO: Reminders API
  async getRemindersForUser(userId: string): Promise<Reminder[]> {
    if (USE_MOCK_DATA) {
      console.log('[Mock mode] Getting reminders for user', userId)
      await new Promise(resolve => setTimeout(resolve, 600))
      return []
    }

    console.log('[Real mode] Getting reminders from Supabase for user', userId)
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_for', { ascending: true })

    if (error) {
      console.error('Supabase error getting reminders:', error)
      return []
    }

    return data || []
  }

  async createReminder(
    reminder: Omit<Reminder, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Reminder | null> {
    if (USE_MOCK_DATA) {
      console.log('[Mock mode] Creating reminder')
      await new Promise(resolve => setTimeout(resolve, 400))
      return {
        ...reminder,
        id: `mock-reminder-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }

    console.log('[Real mode] Creating reminder in Supabase')
    const { data, error } = await supabase.from('reminders').insert([reminder]).select().single()

    if (error) {
      console.error('Supabase error creating reminder:', error)
      return null
    }

    return data
  }

  async getUserReport(userId: string, managerId?: string): Promise<UserReport> {
    if (USE_MOCK_DATA) {
      console.log('Mock mode: Getting report for user', userId)
      await new Promise(resolve => setTimeout(resolve, 800))

      const report = MOCK_REPORTS[userId]
      if (!report) {
        return {
          user_id: userId,
          report_generated_at: new Date().toISOString(),
          summary: {
            total_contacts: 0,
            total_reminders: 0,
            active_reminders: 0,
            completed_reminders: 0,
            failed_reminders: 0,
            pending_reminders: 0,
          },
          recent_activity: [],
          upcoming_reminders: [],
          recent_reminders: [],
        }
      }
      return report
    }

  console.log('Real mode: Getting report for user', userId)
  
  // Try to fetch from external API first if managerId is provided
  if (managerId) {
    try {
      const externalReport = await this.fetchExternalReport(managerId)
      if (externalReport) {
        console.log('External API report received successfully')
        return externalReport
      }
    } catch (error) {
      console.warn('External API failed, falling back to Supabase:', error)
    }
  }

  // Fallback: Build report from Supabase
  console.log('Building comprehensive report from Supabase for user', userId)
  
  try {
    const now = new Date().toISOString()

    // Get all reminders for the user
    const { data: allReminders, error: remindersError } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_for', { ascending: true })

    if (remindersError) {
      console.error('Error getting reminders:', remindersError)
    }

    const reminders = allReminders || []

    // Get contacts count
    const { count: contactsCount, error: contactsError } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (contactsError) {
      console.error('Error counting contacts:', contactsError)
    }

    // Categorize reminders
    const pendingReminders = reminders.filter(r => r.status === 'PENDING')
    const completedReminders = reminders.filter(r => r.status === 'COMPLETED')
    const failedReminders = reminders.filter(r => r.status === 'FAILED')
    const activeReminders = reminders.filter(
      r => r.status === 'PENDING' || r.status === 'SENT'
    )

    // Get upcoming reminders (pending and scheduled in the future)
    const upcomingReminders = pendingReminders
      .filter(r => new Date(r.scheduled_for) >= new Date())
      .slice(0, 10)
      .map(r => ({
        id: r.id,
        task: r.task,
        scheduled_for: r.scheduled_for,
        status: r.status,
        created_at: r.created_at,
        last_sent_at: r.last_sent_at,
        attempts: r.attempts,
      }))

    // Get recent reminders (last 5 regardless of status)
    const recentReminders = reminders
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        task: r.task,
        scheduled_for: r.scheduled_for,
        status: r.status,
        created_at: r.created_at,
        last_sent_at: r.last_sent_at,
        attempts: r.attempts,
      }))

    // Build recent activity from reminders
    const recentActivity = reminders
      .filter(r => r.last_sent_at || r.status === 'COMPLETED')
      .sort((a, b) => {
        const dateA = new Date(a.last_sent_at || a.updated_at || a.created_at)
        const dateB = new Date(b.last_sent_at || b.updated_at || b.created_at)
        return dateB.getTime() - dateA.getTime()
      })
      .slice(0, 10)
      .map(r => ({
        type: r.status === 'COMPLETED' ? 'reminder_completed' : 'reminder_sent',
        timestamp: r.last_sent_at || r.updated_at || r.created_at,
        description: `Reminder: ${r.task}`,
      }))

    const report: UserReport = {
      user_id: userId,
      report_generated_at: now,
      summary: {
        total_contacts: contactsCount || 0,
        total_reminders: reminders.length,
        active_reminders: activeReminders.length,
        completed_reminders: completedReminders.length,
        failed_reminders: failedReminders.length,
        pending_reminders: pendingReminders.length,
      },
      recent_activity: recentActivity,
      upcoming_reminders: upcomingReminders,
      recent_reminders: recentReminders,
    }

    console.log('Report built successfully:', {
      total_reminders: report.summary.total_reminders,
      upcoming: report.upcoming_reminders.length,
      recent: report.recent_reminders?.length || 0,
    })

    return report
  } catch (error) {
    console.error('Error building user report:', error)
    
    return {
      user_id: userId,
      report_generated_at: new Date().toISOString(),
      summary: {
        total_contacts: 0,
        total_reminders: 0,
        active_reminders: 0,
        completed_reminders: 0,
        failed_reminders: 0,
        pending_reminders: 0,
      },
      recent_activity: [],
      upcoming_reminders: [],
      recent_reminders: [],
    }
  }
}

private async fetchExternalReport(managerId: string): Promise<UserReport | null> {
  const REPORTS_API_URL = process.env.EXPO_PUBLIC_REPORTS_API_URL || 'https://example.com/reports'
  
  try {
    console.log('Fetching external report for manager:', managerId)
    
    const token = await this.getToken()
    if (!token) {
      console.warn('No auth token available for external API')
      return null
    }

    const response = await fetch(`${REPORTS_API_URL}/${managerId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('External API error:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
  
    const report: UserReport = {
      user_id: data.user_id || data.userId,
      report_generated_at: data.report_generated_at || data.generatedAt || new Date().toISOString(),
      summary: {
        total_contacts: data.summary?.total_contacts || data.totalContacts || 0,
        total_reminders: data.summary?.total_reminders || data.totalReminders || 0,
        active_reminders: data.summary?.active_reminders || data.activeReminders || 0,
        completed_reminders: data.summary?.completed_reminders || data.completedReminders || 0,
        failed_reminders: data.summary?.failed_reminders || data.failedReminders || 0,
        pending_reminders: data.summary?.pending_reminders || data.pendingReminders || 0,
      },
      recent_activity: data.recent_activity || data.recentActivity || [],
      upcoming_reminders: data.upcoming_reminders || data.upcomingReminders || [],
      recent_reminders: data.recent_reminders || data.recentReminders || [],
    }

    console.log('External report fetched successfully')
    return report

  } catch (error) {
    console.error('Error fetching external report:', error)
    return null
  }
}

  // Contacts API
  async getContactsForUser(userId: string): Promise<Contact[]> {
    if (USE_MOCK_DATA) {
      console.log('[Mock mode] Getting contacts for user', userId)
      await new Promise(resolve => setTimeout(resolve, 600))

      const { MOCK_CONTACTS } = await import('./atoApi.mocks')
      const userContacts = MOCK_CONTACTS[userId] || []
      return userContacts
    }

    console.log('[Real mode] Getting contacts from Supabase for user', userId)
    const { data, error } = await supabase.from('contacts').select('*').eq('user_id', userId)

    if (error) {
      console.error('Supabase error getting contacts:', error)
      return []
    }

    return data || []
  }
}

export const atoApi = new AtoApiService()

export { MOCK_IDS } from './atoApi.mocks'

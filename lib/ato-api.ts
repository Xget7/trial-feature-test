import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'
import { MOCK_MANAGERS, MOCK_USERS, MOCK_REPORTS } from './ato-api.mocks'

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
      console.log('🎭 Mock mode: Getting manager', managerId)
      await new Promise(resolve => setTimeout(resolve, 500))

      const manager = MOCK_MANAGERS[managerId]
      if (!manager) {
        throw new Error(`Manager with id ${managerId} not found`)
      }
      return manager
    }

    console.log('🔐 Real mode: Getting manager from Supabase', managerId)
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
      console.log('🎭 Mock mode: Getting user', userId)
      await new Promise(resolve => setTimeout(resolve, 500))

      const user = MOCK_USERS[userId]
      if (!user) {
        throw new Error(`User with id ${userId} not found`)
      }
      return user
    }

    console.log('🔐 Real mode: Getting user from Supabase', userId)
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
      console.log('🎭 Mock mode: Getting users for manager', managerId)
      await new Promise(resolve => setTimeout(resolve, 600))

      const manager = MOCK_MANAGERS[managerId]
      if (!manager || !manager.user_id) {
        return []
      }

      const user = MOCK_USERS[manager.user_id]
      return user ? [user] : []
    }

    console.log('🔐 Real mode: Getting users from Supabase for manager', managerId)
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
      console.log('🎭 Mock mode: Getting selected user for manager', managerId)
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

    console.log('🔐 Real mode: Getting selected user from Supabase', managerId)
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
      console.log('🎭 Mock mode: Setting selected user', { managerId, userId })
      await new Promise(resolve => setTimeout(resolve, 400))
      return true
    }

    console.log('🔐 Real mode: Setting selected user in Supabase', { managerId, userId })
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

      console.log('✅ Selected user updated successfully')
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
      console.log('🎭 Mock mode: Getting managed users with selection', managerId)
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

    console.log('🔐 Real mode: Getting managed users with selection from Supabase', managerId)
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
      console.log('🎭 Mock mode: Getting reminders for user', userId)
      await new Promise(resolve => setTimeout(resolve, 600))
      // Retornar array vacío por ahora en modo mock
      return []
    }

    console.log('🔐 Real mode: Getting reminders from Supabase for user', userId)
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
      console.log('🎭 Mock mode: Creating reminder')
      await new Promise(resolve => setTimeout(resolve, 400))
      return {
        ...reminder,
        id: `mock-reminder-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }

    console.log('🔐 Real mode: Creating reminder in Supabase')
    const { data, error } = await supabase.from('reminders').insert([reminder]).select().single()

    if (error) {
      console.error('Supabase error creating reminder:', error)
      return null
    }

    return data
  }

  // Reports API
  async getUserReport(userId: string): Promise<UserReport> {
    if (USE_MOCK_DATA) {
      console.log('🎭 Mock mode: Getting report for user', userId)
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
          },
          recent_activity: [],
          upcoming_reminders: [],
        }
      }
      return report
    }

    console.log('🔐 Real mode: Getting report (mock data for now)')
    return {
      user_id: userId,
      report_generated_at: new Date().toISOString(),
      summary: {
        total_contacts: 0,
        total_reminders: 0,
        active_reminders: 0,
        completed_reminders: 0,
      },
      recent_activity: [],
      upcoming_reminders: [],
    }
  }

  // Contacts API
  async getContactsForUser(userId: string): Promise<Contact[]> {
    if (USE_MOCK_DATA) {
      console.log('🎭 Mock mode: Getting contacts for user', userId)
      await new Promise(resolve => setTimeout(resolve, 600))

      const { MOCK_CONTACTS } = await import('./ato-api.mocks')
      const userContacts = MOCK_CONTACTS[userId] || []
      return userContacts
    }

    console.log('🔐 Real mode: Getting contacts from Supabase for user', userId)
    const { data, error } = await supabase.from('contacts').select('*').eq('user_id', userId)

    if (error) {
      console.error('Supabase error getting contacts:', error)
      return []
    }

    return data || []
  }
}

export const atoApi = new AtoApiService()

export { MOCK_IDS } from './ato-api.mocks'

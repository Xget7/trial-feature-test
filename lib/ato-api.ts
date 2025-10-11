// lib/ato-api.ts
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

    // Usar Supabase directamente
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

    // Usar Supabase directamente
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

    // Usar Supabase directamente con JOIN
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

    // Extraer los usuarios del resultado del JOIN
    const users = data.map((item: any) => item.users).filter(Boolean)

    return users
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

    // Por ahora devolver reporte vacío - implementar cuando tengas la tabla de reportes
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
}

export const atoApi = new AtoApiService()

// Re-export mock IDs for convenience
export { MOCK_IDS } from './ato-api.mocks'

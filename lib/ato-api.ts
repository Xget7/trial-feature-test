import AsyncStorage from '@react-native-async-storage/async-storage'
import { MOCK_MANAGERS, MOCK_USERS, MOCK_REPORTS } from './ato-api.mocks'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || ''
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

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getToken()

    if (!token) {
      throw new Error('No authentication token found')
    }

    const url = `${API_BASE_URL}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized - please log in again')
      }

      let errorMessage = `Request failed with status ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.detail || errorData.message || errorMessage
      } catch {
        errorMessage = (await response.text()) || errorMessage
      }

      throw new Error(errorMessage)
    }

    if (response.status === 204) {
      return {} as T
    }

    return response.json()
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
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500))

      const manager = MOCK_MANAGERS[managerId]
      if (!manager) {
        throw new Error(`Manager with id ${managerId} not found`)
      }
      return manager
    }

    return this.makeRequest<AtoManager>(`/managers/${managerId}`)
  }

  // Users API
  async getUserById(userId: string): Promise<AtoUser> {
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500))

      const user = MOCK_USERS[userId]
      if (!user) {
        throw new Error(`User with id ${userId} not found`)
      }
      return user
    }

    return this.makeRequest<AtoUser>(`/users/${userId}`)
  }

  async getUsersByManagerId(managerId: string): Promise<AtoUser[]> {
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 600))

      // In mock mode, return all users that are managed by this manager
      // In real API, this would filter by manager_id relationship
      const manager = MOCK_MANAGERS[managerId]
      if (!manager || !manager.user_id) {
        return []
      }

      // Return the user associated with this manager
      const user = MOCK_USERS[manager.user_id]
      return user ? [user] : []
    }

    return this.makeRequest<AtoUser[]>(`/managers/${managerId}/users`)
  }

  // Reports API
  async getUserReport(userId: string): Promise<UserReport> {
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800))

      const report = MOCK_REPORTS[userId]
      if (!report) {
        // Return a default empty report if user not found
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

    return this.makeRequest<UserReport>(`/reports/${userId}`)
  }
}

export const atoApi = new AtoApiService()

// Re-export mock IDs for convenience
export { MOCK_IDS } from './ato-api.mocks'

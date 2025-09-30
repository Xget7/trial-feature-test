import AsyncStorage from '@react-native-async-storage/async-storage'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || ''
const TOKEN_KEY = 'ato_api_token'

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
    return this.makeRequest<AtoManager>(`/managers/${managerId}`)
  }

  // Reports API
  async getUserReport(userId: string): Promise<UserReport> {
    return this.makeRequest<UserReport>(`/reports/${userId}`)
  }
}

export const atoApi = new AtoApiService()

import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { atoApi, AtoManager, AtoUser, UserReport, MOCK_IDS } from '../lib/ato-api'
import { t } from '../lib/i18n'

interface AtoContextType {
  // Manager data
  currentManager: AtoManager | null
  setCurrentManager: (manager: AtoManager | null) => void

  // User data
  selectedUser: AtoUser | null
  setSelectedUser: (user: AtoUser | null) => void
  managedUsers: AtoUser[]
  setManagedUsers: (users: AtoUser[]) => void

  // User report data
  userReport: UserReport | null
  setUserReport: (report: UserReport | null) => void

  // Loading states
  loading: boolean
  setLoading: (loading: boolean) => void

  // Error handling
  error: string | null
  setError: (error: string | null) => void

  // Helper functions
  refreshUserReport: () => Promise<void>
  initializeManagerAndUsers: (supabaseUserId: string, accessToken: string) => Promise<void>
  getGreeting: () => string
  getUserStatusMessage: () => string
}

const AtoContext = createContext<AtoContextType | undefined>(undefined)

export const useAto = () => {
  const context = useContext(AtoContext)
  if (!context) {
    throw new Error('useAto must be used within an AtoProvider')
  }
  return context
}

export const AtoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentManager, setCurrentManager] = useState<AtoManager | null>(null)
  const [selectedUser, setSelectedUser] = useState<AtoUser | null>(null)
  const [managedUsers, setManagedUsers] = useState<AtoUser[]>([])
  const [userReport, setUserReport] = useState<UserReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Initializes manager and user data using Supabase authentication
   * @param supabaseUserId - The Supabase user ID (matches manager ID)
   * @param accessToken - The access token for API authentication
   */
  const initializeManagerAndUsers = async (supabaseUserId: string, accessToken: string) => {
    try {
      setLoading(true)
      setError(null)

      // Set the API token (works for both mock and real mode)
      await atoApi.setAuthToken(accessToken)

      // Get manager by ID - the API service will handle mock vs real mode
      const manager = await atoApi.getManagerById(supabaseUserId)
      setCurrentManager(manager)

      // Get users managed by this manager
      const users = await atoApi.getUsersByManagerId(supabaseUserId)
      setManagedUsers(users)

      // If there are users, select the first one by default
      if (users.length > 0) {
        setSelectedUser(users[0])
      } else {
        setSelectedUser(null)
      }

      console.log('Manager and users initialized:', { manager, userCount: users.length })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error initializing data'
      setError(errorMessage)
      console.error('Error in initializeManagerAndUsers:', err)
    } finally {
      setLoading(false)
    }
  }

  const refreshUserReport = async () => {
    if (!selectedUser) return

    try {
      setLoading(true)
      setError(null)

      // Get user report from API - handles mock vs real mode
      const report = await atoApi.getUserReport(selectedUser.id)
      setUserReport(report)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading user report'
      setError(errorMessage)
      console.error('Error fetching user report:', err)
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = (): string => {
    const now = new Date()
    const hour = now.getHours()

    if (hour < 12) {
      return '¡Buenos días'
    } else if (hour < 18) {
      return '¡Buenas tardes'
    } else {
      return '¡Buenas noches'
    }
  }

  const getUserStatusMessage = (): string => {
    if (!selectedUser) return t('userStatus.noUserSelected')
    if (!userReport) return t('userStatus.loadingStatus')

    const hasRecentActivity = userReport.recent_activity.length > 0
    const userName = selectedUser.nickname || selectedUser.name

    if (hasRecentActivity) {
      const latestActivity = userReport.recent_activity[0]
      const activityDate = new Date(latestActivity.timestamp)
      const today = new Date()
      const isToday = activityDate.toDateString() === today.toDateString()

      if (isToday) {
        return t('userStatus.recentActivity', { userName })
      } else {
        return t('userStatus.lastActivity', {
          userName,
          date: activityDate.toLocaleDateString(),
        })
      }
    } else {
      return t('userStatus.noRecentActivity', { userName })
    }
  }

  // Auto-refresh user report when selected user changes
  useEffect(() => {
    if (selectedUser) {
      refreshUserReport()
    } else {
      setUserReport(null)
    }
  }, [selectedUser])

  // Set up periodic refresh of user report (every 5 minutes)
  useEffect(() => {
    if (!selectedUser) return

    const interval = setInterval(
      () => {
        refreshUserReport()
      },
      5 * 60 * 1000
    ) // 5 minutes

    return () => clearInterval(interval)
  }, [selectedUser])

  const value: AtoContextType = {
    currentManager,
    setCurrentManager,
    selectedUser,
    setSelectedUser,
    managedUsers,
    setManagedUsers,
    userReport,
    setUserReport,
    loading,
    setLoading,
    error,
    setError,
    refreshUserReport,
    initializeManagerAndUsers,
    getGreeting,
    getUserStatusMessage,
  }

  return <AtoContext.Provider value={value}>{children}</AtoContext.Provider>
}

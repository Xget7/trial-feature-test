import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { atoApi, AtoManager, AtoUser, UserReport } from '../lib/atoApi'
import { t } from '../lib/i18n'
import { interpolate } from '../components/I18nProvider'

interface AtoContextType {
  currentManager: AtoManager | null
  setCurrentManager: (manager: AtoManager | null) => void

  selectedUser: AtoUser | null
  setSelectedUser: (user: AtoUser | null) => void
  managedUsers: AtoUser[]
  setManagedUsers: (users: AtoUser[]) => void

  userReport: UserReport | null
  setUserReport: (report: UserReport | null) => void

  loading: boolean
  setLoading: (loading: boolean) => void

  error: string | null
  setError: (error: string | null) => void

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

  const initializeManagerAndUsers = useCallback(async (supabaseUserId: string, accessToken: string) => {
    try {
      setLoading(true)
      setError(null)

      await atoApi.setAuthToken(accessToken)

      const manager = await atoApi.getManagerById(supabaseUserId)
      setCurrentManager(manager)

      const users = await atoApi.getUsersByManagerId(supabaseUserId)
      setManagedUsers(users)

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
  }, [])

  const refreshUserReport = useCallback(async () => {
    if (!selectedUser) return

    try {
      setLoading(true)
      setError(null)

      const report = await atoApi.getUserReport(selectedUser.id)
      setUserReport(report)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading user report'
      setError(errorMessage)
      console.error('Error fetching user report:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedUser])

  const getGreeting = useCallback((): string => {
    const now = new Date()
    const hour = now.getHours()

    if (hour < 12) {
      return '¡Buenos días'
    } else if (hour < 18) {
      return '¡Buenas tardes'
    } else {
      return '¡Buenas noches'
    }
  }, [])

  const getUserStatusMessage = useCallback((): string => {
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
        return interpolate(t('userStatus.recentActivity'), { userName })
      } else {
        return interpolate(t('userStatus.lastActivity'), {
          userName,
          date: activityDate.toLocaleDateString(),
        })
      }
    } else {
      return interpolate(t('userStatus.noRecentActivity'), { userName })
    }
  }, [selectedUser, userReport])

  useEffect(() => {
    if (selectedUser) {
      refreshUserReport()
    } else {
      setUserReport(null)
    }
  }, [selectedUser?.id])

  useEffect(() => {
    if (!selectedUser) return

    const interval = setInterval(() => {
      refreshUserReport()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [selectedUser?.id])

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
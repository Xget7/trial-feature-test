import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { atoApi } from '@/lib/ato-api'
import type { UserWithRelation } from '@/lib/ato-api'
import { useAto } from './AtoContext'

interface SelectedUserContextType {
  selectedUser: UserWithRelation | null
  isLoading: boolean
  error: string | null
  allUsers: (UserWithRelation & { isSelected: boolean })[]

  refreshSelectedUser: () => Promise<void>
  setSelectedUser: (userId: string) => Promise<boolean>
  refreshAllUsers: () => Promise<void>
}

const SelectedUserContext = createContext<SelectedUserContextType | undefined>(undefined)

export const useSelectedUser = () => {
  const context = useContext(SelectedUserContext)
  if (!context) {
    throw new Error('useSelectedUser must be used within SelectedUserProvider')
  }
  return context
}

export const SelectedUserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentManager } = useAto()
  const [selectedUser, setSelectedUserState] = useState<UserWithRelation | null>(null)
  const [allUsers, setAllUsers] = useState<(UserWithRelation & { isSelected: boolean })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshSelectedUser = async () => {
    if (!currentManager?.id) {
      setSelectedUserState(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      console.log('[SelectedUser] Fetching selected user for manager:', currentManager.id)

      const user = await atoApi.getSelectedUser(currentManager.id)
      setSelectedUserState(user)

      console.log('[SelectedUser] Selected user loaded:', user?.name || 'none')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading selected user'
      setError(errorMessage)
      console.error('[SelectedUser] Error refreshing:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshAllUsers = async () => {
    if (!currentManager?.id) {
      setAllUsers([])
      return
    }

    try {
      console.log('[SelectedUser] Fetching all managed users for manager:', currentManager.id)

      const users = await atoApi.getManagedUsersWithSelection(currentManager.id)
      setAllUsers(users)

      console.log('[SelectedUser] Loaded', users.length, 'managed users')
    } catch (err) {
      console.error('[SelectedUser] Error refreshing all users:', err)
      setAllUsers([])
    }
  }

  const setSelectedUser = async (userId: string): Promise<boolean> => {
    if (!currentManager?.id) {
      console.error('[SelectedUser] No manager ID available')
      return false
    }

    try {
      console.log('[SelectedUser] Setting selected user:', userId)

      const success = await atoApi.setSelectedUser(currentManager.id, userId)

      if (success) {
        console.log('[SelectedUser] Successfully set selected user')
        await Promise.all([refreshSelectedUser(), refreshAllUsers()])
      } else {
        console.error('[SelectedUser] Failed to set selected user')
      }

      return success
    } catch (err) {
      console.error('[SelectedUser] Error setting selected user:', err)
      return false
    }
  }

  useEffect(() => {
    if (currentManager?.id) {
      console.log('[SelectedUser] Manager changed, initializing...')
      refreshSelectedUser()
      refreshAllUsers()
    } else {
      console.log('[SelectedUser] No manager, clearing state')
      setSelectedUserState(null)
      setAllUsers([])
      setIsLoading(false)
    }
  }, [currentManager?.id])

  const value: SelectedUserContextType = {
    selectedUser,
    isLoading,
    error,
    allUsers,
    refreshSelectedUser,
    setSelectedUser,
    refreshAllUsers,
  }

  return <SelectedUserContext.Provider value={value}>{children}</SelectedUserContext.Provider>
}

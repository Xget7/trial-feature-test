import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react'
import { atoApi } from '@/lib/atoApi'
import type { UserWithRelation } from '@/lib/atoApi'
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
  
  const initializedManagerIdRef = useRef<string | null>(null)
  const isInitializingRef = useRef(false)

  const refreshSelectedUser = useCallback(async () => {
    if (!currentManager?.id) {
      setSelectedUserState(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const user = await atoApi.getSelectedUser(currentManager.id)
      setSelectedUserState(user)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading selected user'
      setError(errorMessage)
      console.error('[SelectedUser] Error refreshing:', err)
    } finally {
      setIsLoading(false)
    }
  }, [currentManager?.id])

  const refreshAllUsers = useCallback(async () => {
    if (!currentManager?.id) {
      setAllUsers([])
      return
    }

    try {
      const users = await atoApi.getManagedUsersWithSelection(currentManager.id)
      setAllUsers(users)
    } catch (err) {
      console.error('[SelectedUser] Error refreshing all users:', err)
      setAllUsers([])
    }
  }, [currentManager?.id])

  const setSelectedUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!currentManager?.id) {
      console.error('[SelectedUser] No manager ID available')
      return false
    }

    try {
      const success = await atoApi.setSelectedUser(currentManager.id, userId)

      if (success) {
        await Promise.all([refreshSelectedUser(), refreshAllUsers()])
      }

      return success
    } catch (err) {
      console.error('[SelectedUser] Error setting selected user:', err)
      return false
    }
  }, [currentManager?.id, refreshSelectedUser, refreshAllUsers])

  useEffect(() => {
    const managerId = currentManager?.id
    let isCancelled = false

    // No manager yet
    if (!managerId) {
      setSelectedUserState(null)
      setAllUsers([])
      setIsLoading(false)
      initializedManagerIdRef.current = null
      return
    }

    // Already initializing
    if (isInitializingRef.current) {
      return
    }

    // Already initialized for this manager
    if (initializedManagerIdRef.current === managerId) {
      return
    }

    // Initialize
    const initialize = async () => {
      isInitializingRef.current = true
      console.log('[SelectedUser] Initializing for manager:', managerId)

      try {
        const [user, users] = await Promise.all([
          atoApi.getSelectedUser(managerId),
          atoApi.getManagedUsersWithSelection(managerId)
        ])

        // Only update state if not cancelled
        if (!isCancelled) {
          setSelectedUserState(user)
          setAllUsers(users)
          initializedManagerIdRef.current = managerId

          console.log('[SelectedUser] Initialization complete')
        } else {
          console.log('[SelectedUser] Initialization cancelled (component unmounted)')
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('[SelectedUser] Initialization failed:', error)
          setError(error instanceof Error ? error.message : 'Initialization failed')
          initializedManagerIdRef.current = null
        }
      } finally {
        if (!isCancelled) {
          isInitializingRef.current = false
          setIsLoading(false)
        }
      }
    }

    initialize()

    // Cleanup function
    return () => {
      isCancelled = true
      isInitializingRef.current = false
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
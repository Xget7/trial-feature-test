import React, { useEffect, useRef } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useAto } from '@/contexts/AtoContext'

/**
 * Component that initializes AtoContext when auth state changes.
 * This separates the concern of auth from the AtoContext initialization.
 */
export const AtoInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session, loading: authLoading } = useAuth()
  const { initializeManagerAndUsers } = useAto()
  
  const initializedUserIdRef = useRef<string | null>(null)
  const isInitializingRef = useRef(false)

  useEffect(() => {
    let isCancelled = false

    const initAto = async () => {
      // Don't initialize while auth is loading
      if (authLoading) {
        return
      }

      // Don't initialize if no user or session
      if (!user || !session) {
        initializedUserIdRef.current = null
        return
      }

      // Don't initialize if already initializing
      if (isInitializingRef.current) {
        console.log('[AtoInitializer] Already initializing, skipping...')
        return
      }

      // Don't initialize if already initialized for this user
      if (initializedUserIdRef.current === user.id) {
        console.log('[AtoInitializer] Already initialized for user:', user.id)
        return
      }

      console.log('[AtoInitializer] Initializing with user:', user.id)
      isInitializingRef.current = true

      try {
        await initializeManagerAndUsers(user.id, session.access_token)

        // Only update if not cancelled
        if (!isCancelled) {
          initializedUserIdRef.current = user.id
          console.log('[AtoInitializer] Initialization complete for user:', user.id)
        } else {
          console.log('[AtoInitializer] Initialization cancelled (component unmounted)')
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('[AtoInitializer] Initialization failed:', error)
          initializedUserIdRef.current = null
        }
      } finally {
        if (!isCancelled) {
          isInitializingRef.current = false
        }
      }
    }

    initAto()

    // Cleanup function
    return () => {
      isCancelled = true
      isInitializingRef.current = false
    }
  }, [user?.id, session?.access_token, authLoading, initializeManagerAndUsers])

  return <>{children}</>
}
import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import { useAto } from '../contexts/AtoContext'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const { initializeManagerAndUsers } = useAto()

  useEffect(() => {
    let authSubscription: any = null

    const initializeAuth = async () => {
      try {
        // Step 1: Check for mock user first
        const mockUserData = await AsyncStorage.getItem('ato-mock-user')

        if (mockUserData) {
          console.log('🎭 Mock mode detected - loading mock user')
          const mockUser = JSON.parse(mockUserData)
          console.log('Mock user ID:', mockUser.id)

          setUser(mockUser)
          setSession({
            access_token: 'mock-token-' + mockUser.id,
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: mockUser,
          } as Session)

          // Initialize with mock data
          console.log('Initializing with mock manager ID:', mockUser.id)
          await initializeManagerAndUsers(
            mockUser.id, // 'mock-manager-1' or 'mock-manager-2'
            'mock-token-' + mockUser.id
          )

          setLoading(false)
          return // Exit early - don't set up Supabase listeners
        }

        // Step 2: Check for legacy store testing user
        const storeTestingUserData = await AsyncStorage.getItem('ato-store-testing-user')

        if (storeTestingUserData) {
          console.log('🧪 Store testing mode detected')
          const storeTestingUser = JSON.parse(storeTestingUserData)

          setUser(storeTestingUser)
          setSession({
            access_token: 'mock-token-' + storeTestingUser.id,
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: storeTestingUser,
          } as Session)

          await initializeManagerAndUsers(storeTestingUser.id, 'mock-token-' + storeTestingUser.id)

          setLoading(false)
          return // Exit early
        }

        // Step 3: No mock user - set up real Supabase authentication
        console.log('🔐 Real auth mode - setting up Supabase')

        // Set up Supabase auth listener
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state changed:', event, session?.user?.id)

          if (session?.user) {
            setSession(session)
            setUser(session.user)

            // Initialize manager and users data
            await initializeManagerAndUsers(session.user.id, session.access_token)
          } else {
            setSession(null)
            setUser(null)
          }

          setLoading(false)
        })

        authSubscription = authListener.subscription

        // Get initial session
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession()

        if (initialSession?.user) {
          console.log('Found existing Supabase session')
          setSession(initialSession)
          setUser(initialSession.user)
          await initializeManagerAndUsers(initialSession.user.id, initialSession.access_token)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error initializing auth:', error)
        setLoading(false)
      }
    }

    initializeAuth()

    // Cleanup
    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
    }
  }, [])

  const signOut = async () => {
    try {
      console.log('Signing out...')

      // Clear all mock user data
      await AsyncStorage.removeItem('ato-mock-user')
      await AsyncStorage.removeItem('ato-store-testing-user')

      // Sign out from Supabase
      await supabase.auth.signOut()

      setUser(null)
      setSession(null)

      console.log('Signed out successfully')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

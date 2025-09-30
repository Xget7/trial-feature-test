import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import * as Linking from 'expo-linking'
import * as QueryParams from 'expo-auth-session/build/QueryParams'
import AsyncStorage from '@react-native-async-storage/async-storage'

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

  const createSessionFromUrl = async (url: string) => {
    try {
      const { params } = QueryParams.getQueryParams(url)
      const { access_token, refresh_token } = params

      if (!access_token) return

      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      })

      if (error) throw error
      return data.session
    } catch (error) {
      console.error('Error creating session from URL:', error)
      return null
    }
  }

  const signOut = async () => {
    try {
      // Clear store testing data if present
      await AsyncStorage.removeItem('ato-store-testing-user')

      // Sign out from Supabase
      await supabase.auth.signOut()

      // Clear local state
      setUser(null)
      setSession(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    const initializeAuth = async () => {
      // Check for store testing mode first
      try {
        const storeTestingUser = await AsyncStorage.getItem('ato-store-testing-user')
        if (storeTestingUser) {
          const mockUser = JSON.parse(storeTestingUser) as User
          setUser(mockUser)
          setSession({
            user: mockUser,
            access_token: 'store-testing-token',
            refresh_token: 'store-testing-refresh',
            expires_in: 3600,
            token_type: 'bearer',
            expires_at: Date.now() / 1000 + 3600
          } as Session)
          setLoading(false)
          return
        }
      } catch (error) {
        console.error('Error checking store testing mode:', error)
      }

      // Get initial session from Supabase
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      })
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Don't override store testing mode
      const storeTestingUser = await AsyncStorage.getItem('ato-store-testing-user')
      if (!storeTestingUser) {
        setSession(session)
        setUser(session?.user ?? null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Handle deep linking for magic links
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      if (url.includes('atoapp://auth/callback')) {
        createSessionFromUrl(url)
      }
    }

    // Handle initial URL if app was opened from a link
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink(url)
      }
    })

    // Listen for URL changes
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url)
    })

    return () => subscription?.remove()
  }, [])

  const value = {
    user,
    session,
    loading,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

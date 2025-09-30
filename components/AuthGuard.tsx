import React, { useEffect } from 'react'
import { useRouter, useSegments } from 'expo-router'
import { useAuth } from './AuthProvider'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = ['dashboard', 'contacts', 'profile', 'settings'].includes(segments[0])
    const isAuthCallback = segments[0] === 'auth' && segments[1] === 'callback'
    const isOnTabs = segments[0] === '(tabs)' || segments.length <= 0

    if (!user && (inAuthGroup || isOnTabs)) {
      // Redirect to login if not authenticated
      router.replace('/login')
    } else if (user && (segments[0] === 'login' || isOnTabs) && !isAuthCallback) {
      // Redirect authenticated users to dashboard from login or tabs
      router.replace('/dashboard')
    }
  }, [user, loading, segments, router])

  if (loading) {
    return null // or a loading screen
  }

  return <>{children}</>
}

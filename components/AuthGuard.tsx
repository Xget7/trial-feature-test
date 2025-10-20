import React, { useEffect } from 'react'
import { useRouter, usePathname } from 'expo-router'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { useAuth } from './AuthProvider'
import { useAto } from '@/contexts/AtoContext'

const PUBLIC_ROUTES = ['/login', '/auth/callback']
const PROTECTED_ROUTES = ['/', '/contacts', '/profile', '/settings']

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth()
  const { loading: atoLoading } = useAto()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (authLoading) {
      return
    }

    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route))
    const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname === route || pathname?.startsWith(route))

    console.log('[AuthGuard] Route check:', {
      pathname,
      isPublicRoute,
      isProtectedRoute,
      hasUser: !!user,
      authLoading,
      atoLoading,
    })

    if (!user && isProtectedRoute) {
      console.log('[AuthGuard] No user, redirecting to login')
      router.replace('/login')
    } else if (user && isPublicRoute && pathname !== '/auth/callback') {
      console.log('[AuthGuard] User authenticated, redirecting to home')
      router.replace('/')
    }
  }, [user, authLoading, pathname, router])

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D4FF" />
      </View>
    )
  }

  if (user && atoLoading && pathname !== '/login' && pathname !== '/auth/callback') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D4FF" />
      </View>
    )
  }

  return <>{children}</>
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
})
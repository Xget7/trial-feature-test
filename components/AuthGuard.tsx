import React, { useEffect } from 'react'
import { useRouter, usePathname } from 'expo-router'
import { useAuth } from './AuthProvider'
import { useAto } from '@/contexts/AtoContext'
import { SplashScreen } from './AtoSplashScreen'

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

  // Show splash while auth is initializing
  if (authLoading) {
    return <SplashScreen message="Verificando autenticación..." />
  }

  // Show splash while Ato data is loading (only if user is authenticated)
  if (user && atoLoading && pathname !== '/login' && pathname !== '/auth/callback') {
    return <SplashScreen message="Cargando tu información..." />
  }

  return <>{children}</>
}
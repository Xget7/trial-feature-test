import { useRouter } from 'expo-router'
import React, { useEffect } from 'react'
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native'
import { useAuth } from '../components/AuthProvider'
import { useAto } from '../contexts/AtoContext'
import { DashboardHeader } from '../components/DashboardHeader'
import { UserStatusSection } from '../components/UserStatusSection'
import { RemindersSection } from '../components/RemindersSection'
import { BottomNavigation } from '../components/BottomNavigation'
import { ErrorDisplay, LoadingDisplay } from '../components/ErrorBoundary'
import { useI18n } from '../components/I18nProvider'

export default function DashboardScreen() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { currentManager, loading, error } = useAto()
  const { t } = useI18n()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('No user found, redirecting to login')
      router.replace('/login')
    }
  }, [user, authLoading, router])

  // Show loading state
  if (authLoading || loading) {
    console.log('Dashboard loading...', { authLoading, loading })
    return (
      <SafeAreaView style={styles.container}>
        <LoadingDisplay message={t('dashboard.loadingDashboard')} />
      </SafeAreaView>
    )
  }

  if (error) {
    console.log('Dashboard error:', error)
    return (
      <SafeAreaView style={styles.container}>
        <ErrorDisplay error={error} onRetry={() => router.replace('/login')} onDismiss={() => {}} />
      </SafeAreaView>
    )
  }

  console.log('Dashboard ready with manager:', currentManager?.name)
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <DashboardHeader />
          <UserStatusSection />
          <RemindersSection />
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
      <BottomNavigation />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  bottomSpacer: {
    height: 20,
  },
})

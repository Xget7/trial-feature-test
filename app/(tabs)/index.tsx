import React from 'react'
import { SafeAreaView, ScrollView, StyleSheet, View, Platform } from 'react-native'
import { useAto } from '@/contexts/AtoContext'
import { DashboardHeader } from '@/components/DashboardHeader'
import { UserStatusSection } from '@/components/UserStatusSection'
import { RemindersSection } from '@/components/RemindersSection'
import { ErrorDisplay, LoadingDisplay } from '@/components/ErrorBoundary'
import { useI18n } from '@/components/I18nProvider'

const BOTTOM_NAV_HEIGHT = Platform.OS === 'ios' ? 100 : 90

export default function DashboardScreen() {
  const { currentManager, loading, error } = useAto()
  const { t } = useI18n()

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingDisplay message={t('dashboard.loadingDashboard')} />
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorDisplay
          error={error}
          onRetry={() => {
            // Could trigger a refresh here if needed
          }}
          onDismiss={() => {}}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
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
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: BOTTOM_NAV_HEIGHT + 20, // Espacio para la navegación inferior
  },
  bottomSpacer: {
    height: 20,
  },
})
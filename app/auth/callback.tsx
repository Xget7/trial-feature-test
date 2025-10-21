import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { supabase } from '../../lib/supabase'
import ErrorModal from '../../components/ErrorModal'
import { i18n } from '@/lib/i18n'

export default function AuthCallbackScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showErrorModal, setShowErrorModal] = useState(false)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Auth error:', error)
          setError(i18n.t('authCallback.sessionValidationError'))
          setShowErrorModal(true)
          return
        }

        if (data.session) {
          router.replace('/')
        } else {
          setError(i18n.t('authCallback.sessionNotValidated'))
          setShowErrorModal(true)
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError(i18n.t('authCallback.unexpectedError'))
        setShowErrorModal(true)
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [router])

  const handleRetry = () => {
    setShowErrorModal(false)
    router.replace('/login')
  }

  const handleCloseModal = () => {
    setShowErrorModal(false)
    router.replace('/login')
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#00D4FF" />
          <Text style={styles.loadingText}>
            {i18n.t('authCallback.validatingSession')}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ErrorModal
        visible={showErrorModal}
        title={i18n.t('authCallback.errorTitle')}
        message={error || i18n.t('authCallback.defaultErrorMessage')}
        onRetry={handleRetry}
        onClose={handleCloseModal}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
})

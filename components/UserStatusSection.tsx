import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useAto } from '../contexts/AtoContext'
import { useI18n } from './I18nProvider'

export const UserStatusSection: React.FC = () => {
  const { selectedUser } = useAto()
  const { t } = useI18n()

  if (!selectedUser) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('userStatus.noUserSelected')}</Text>
          <Text style={styles.subtitle}>{t('userStatus.selectUserPrompt')}</Text>
        </View>
      </View>
    )
  }

  const userName = selectedUser.nickname || selectedUser.name

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('userStatus.noRecentUpdates', { userName })}</Text>
          <Text style={styles.subtitle}>{t('userStatus.noConversationToday', { userName })}</Text>
          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>😊</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: -30,
    marginBottom: 24,
    zIndex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emojiContainer: {
    marginTop: 8,
  },
  emoji: {
    fontSize: 56,
  },
})

import { I18n } from 'i18n-js'
import { getLocales } from 'expo-localization'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { es } from './locales/es'
import { en } from './locales/en'

const LANGUAGE_STORAGE_KEY = 'user_language'

// Create the i18n instance
export const i18n = new I18n({
  es,
  en,
})

// Set fallback to Spanish (current default)
i18n.enableFallback = true
i18n.defaultLocale = 'es'

// Get device locale
export const getDeviceLocale = (): string => {
  const locales = getLocales()
  const deviceLanguage = locales[0]?.languageCode

  // Supported languages
  const supportedLanguages = ['es', 'en']

  // Return device language if supported, otherwise fallback to Spanish
  return supportedLanguages.includes(deviceLanguage || '') ? deviceLanguage! : 'es'
}

// Initialize locale
export const initializeI18n = async (): Promise<string> => {
  try {
    // Try to get saved language preference
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)

    if (savedLanguage && ['es', 'en'].includes(savedLanguage)) {
      i18n.locale = savedLanguage
      return savedLanguage
    }

    // Fall back to device locale
    const deviceLocale = getDeviceLocale()
    i18n.locale = deviceLocale

    // Save the detected locale
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, deviceLocale)

    return deviceLocale
  } catch (error) {
    console.warn('Error initializing i18n:', error)
    // Fallback to Spanish
    i18n.locale = 'es'
    return 'es'
  }
}

// Change language and persist preference
export const changeLanguage = async (language: string): Promise<void> => {
  if (!['es', 'en'].includes(language)) {
    throw new Error(`Unsupported language: ${language}`)
  }

  try {
    i18n.locale = language
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch (error) {
    console.error('Error saving language preference:', error)
    throw error
  }
}

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.locale
}

// Translation function with type safety
export const t = (key: string, options?: any): string => {
  return i18n.t(key, options)
}

// Format date based on current locale
export const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
  const locale = i18n.locale === 'es' ? 'es-ES' : 'en-US'
  return date.toLocaleDateString(locale, options)
}

// Format time based on current locale
export const formatTime = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
  const locale = i18n.locale === 'es' ? 'es-ES' : 'en-US'
  return date.toLocaleTimeString(locale, options)
}

// Format relative date (today, tomorrow, etc.)
export const formatRelativeDate = (date: Date): string => {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  }

  if (date.toDateString() === today.toDateString()) {
    return `${t('common.today')}, ${formatTime(date, timeOptions)}`
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return `${t('common.tomorrow')}, ${formatTime(date, timeOptions)}`
  } else {
    const dateOptions: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
    }
    return `${formatDate(date, dateOptions)}, ${formatTime(date, timeOptions)}`
  }
}

export { Translations } from './types'

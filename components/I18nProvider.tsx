import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { initializeI18n, changeLanguage, t } from '../lib/i18n'

interface I18nContextType {
  language: string
  setLanguage: (language: string) => Promise<void>
  t: (key: string, options?: any) => string
  isReady: boolean
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

interface I18nProviderProps {
  children: ReactNode
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<string>('es')
  const [isReady, setIsReady] = useState<boolean>(false)

  useEffect(() => {
    const initialize = async () => {
      try {
        const currentLanguage = await initializeI18n()
        setLanguageState(currentLanguage)
      } catch (error) {
        console.error('Failed to initialize i18n:', error)
        // Fallback to Spanish
        setLanguageState('es')
      } finally {
        setIsReady(true)
      }
    }

    initialize()
  }, [])

  const setLanguage = async (newLanguage: string): Promise<void> => {
    try {
      await changeLanguage(newLanguage)
      setLanguageState(newLanguage)
    } catch (error) {
      console.error('Failed to change language:', error)
      throw error
    }
  }

  const contextValue: I18nContextType = {
    language,
    setLanguage,
    t,
    isReady,
  }

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
}

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

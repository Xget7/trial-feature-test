import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { initializeI18n, changeLanguage, t as originalT } from '../lib/i18n'

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

/**
 * Interpolate parameters into a translation string
 * Supports both {param} and {{param}} formats
 * e.g., "Hello {name}" with {name: "John"} -> "Hello John"
 */
const interpolate = (text: string, params?: Record<string, any>): string => {
  if (!params || typeof text !== 'string') return text

  let result = text.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match
  })

  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match
  })

  return result
}

/**
 * Enhanced t() function with interpolation support
 */
const tWithInterpolation = (key: string, options?: any): string => {
  const translation = originalT(key, options)

  if (options && typeof options === 'object' && !Array.isArray(options)) {
    return interpolate(translation, options)
  }

  return translation
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
    t: tWithInterpolation,
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

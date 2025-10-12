import React, { createContext, useContext, useState, ReactNode } from 'react'

interface AssistantContextType {
  isAssistantVisible: boolean
  showAssistant: () => void
  hideAssistant: () => void
  toggleAssistant: () => void
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined)

interface AssistantProviderProps {
  children: ReactNode
}

export const AssistantProvider: React.FC<AssistantProviderProps> = ({ children }) => {
  const [isAssistantVisible, setIsAssistantVisible] = useState(false)

  const showAssistant = () => {
    console.log('[ASSISTANT CONTEXT] Opening assistant')
    setIsAssistantVisible(true)
  }

  const hideAssistant = () => {
    console.log('[ASSISTANT CONTEXT] Closing assistant')
    setIsAssistantVisible(false)
  }

  const toggleAssistant = () => {
    setIsAssistantVisible(prev => !prev)
  }

  return (
    <AssistantContext.Provider
      value={{
        isAssistantVisible,
        showAssistant,
        hideAssistant,
        toggleAssistant,
      }}
    >
      {children}
    </AssistantContext.Provider>
  )
}

export const useAssistant = (): AssistantContextType => {
  const context = useContext(AssistantContext)
  if (!context) {
    throw new Error('useAssistant must be used within AssistantProvider')
  }
  return context
}

import { useState, useEffect, useCallback } from 'react'
import { atoApi, Contact } from '../lib/atoApi'
import { LoadingState } from '../types/api'

interface UseContactsResult extends LoadingState {
  contacts: Contact[]
  refreshContacts: () => Promise<void>
}

/**
 * Custom hook for managing contacts data for a specific user
 * @param userId - The ID of the user whose contacts to fetch
 * @returns Object containing contacts, loading state, error state, and refresh function
 */
export const useContacts = (userId: string | null): UseContactsResult => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)

      const userContacts = await atoApi.getContactsForUser(userId)
      setContacts(userContacts)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading contacts'
      setError(errorMessage)
      setContacts([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  const refreshContacts = useCallback(async () => {
    await fetchContacts()
  }, [fetchContacts])

  useEffect(() => {
    if (userId) {
      fetchContacts()
    } else {
      setContacts([])
      setError(null)
      setLoading(false)
    }
  }, [userId])

  return {
    contacts,
    loading,
    error,
    refreshContacts,
  }
}

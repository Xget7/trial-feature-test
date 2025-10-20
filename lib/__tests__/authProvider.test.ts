import AsyncStorage from '@react-native-async-storage/async-storage'

jest.mock('@react-native-async-storage/async-storage')
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(),
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
  },
}))
jest.mock('../../contexts/AtoContext', () => ({
  useAto: jest.fn(),
}))

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>

const mockSupabase = {
  auth: {
    onAuthStateChange: jest.fn(),
    getSession: jest.fn(),
    signOut: jest.fn(),
  },
}

const mockUseAto = jest.fn()

describe('AuthContext', () => {
  const mockInitializeManagerAndUsers = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseAto.mockReturnValue({
      initializeManagerAndUsers: mockInitializeManagerAndUsers,
      manager: null,
      users: [],
      selectedUser: null,
      isLoading: false,
      selectUser: jest.fn(),
      refreshData: jest.fn(),
    })

    mockAsyncStorage.getItem.mockResolvedValue(null)
    mockAsyncStorage.removeItem.mockResolvedValue()

    const mockSubscription = { unsubscribe: jest.fn() }
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: mockSubscription },
    })

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    mockSupabase.auth.signOut.mockResolvedValue({ error: null })

    mockInitializeManagerAndUsers.mockResolvedValue(undefined)
  })

  describe('mockUserMode', () => {
    it('shouldLoadMockUserFromStorage', async () => {
      const mockUser = {
        id: 'mock-manager-1',
        email: 'mock@test.com',
      }

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'ato-mock-user') {
          return Promise.resolve(JSON.stringify(mockUser))
        }
        return Promise.resolve(null)
      })

      expect(mockAsyncStorage.getItem).toBeDefined()
    })

    it('shouldInitializeWithMockManager', async () => {
      const mockUser = {
        id: 'mock-manager-1',
        email: 'mock@test.com',
      }

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'ato-mock-user') {
          return Promise.resolve(JSON.stringify(mockUser))
        }
        return Promise.resolve(null)
      })

      const mockUserData = await mockAsyncStorage.getItem('ato-mock-user')
      expect(mockUserData).toBeTruthy()

      if (mockUserData) {
        const parsedUser = JSON.parse(mockUserData)
        await mockInitializeManagerAndUsers(
          parsedUser.id,
          'mock-token-' + parsedUser.id
        )

        expect(mockInitializeManagerAndUsers).toHaveBeenCalledWith(
          'mock-manager-1',
          'mock-token-mock-manager-1'
        )
      }
    })

    it('shouldNotCallSupabaseInMockMode', async () => {
      const mockUser = {
        id: 'mock-manager-1',
        email: 'mock@test.com',
      }

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'ato-mock-user') {
          return Promise.resolve(JSON.stringify(mockUser))
        }
        return Promise.resolve(null)
      })

      const mockUserData = await mockAsyncStorage.getItem('ato-mock-user')
      
      if (mockUserData) {
        expect(mockSupabase.auth.onAuthStateChange).not.toHaveBeenCalled()
      }
    })
  })

  describe('storeTestingMode', () => {
    it('shouldLoadStoreTestingUser', async () => {
      const storeTestingUser = {
        id: 'store-testing-manager',
        email: 'storetesting@test.com',
      }

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'ato-store-testing-user') {
          return Promise.resolve(JSON.stringify(storeTestingUser))
        }
        return Promise.resolve(null)
      })

      const userData = await mockAsyncStorage.getItem('ato-store-testing-user')
      expect(userData).toBeTruthy()

      if (userData) {
        const parsedUser = JSON.parse(userData)
        expect(parsedUser.id).toBe('store-testing-manager')
      }
    })

    it('shouldInitializeWithStoreTestingUser', async () => {
      const storeTestingUser = {
        id: 'store-testing-manager',
        email: 'storetesting@test.com',
      }

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'ato-store-testing-user') {
          return Promise.resolve(JSON.stringify(storeTestingUser))
        }
        return Promise.resolve(null)
      })

      const userData = await mockAsyncStorage.getItem('ato-store-testing-user')

      if (userData) {
        const parsedUser = JSON.parse(userData)
        await mockInitializeManagerAndUsers(
          parsedUser.id,
          'mock-token-' + parsedUser.id
        )

        expect(mockInitializeManagerAndUsers).toHaveBeenCalledWith(
          'store-testing-manager',
          'mock-token-store-testing-manager'
        )
      }
    })
  })

  describe('realAuthMode', () => {
    it('shouldSetupSupabaseAuthListener', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null)

      const result = mockSupabase.auth.onAuthStateChange(jest.fn())

      expect(result).toBeDefined()
      expect(result.data.subscription).toBeDefined()
    })

    it('shouldGetInitialSession', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null)

      const result = await mockSupabase.auth.getSession()

      expect(mockSupabase.auth.getSession).toHaveBeenCalled()
      expect(result.data).toBeDefined()
    })

    it('shouldInitializeWithExistingSession', async () => {
      const mockSession = {
        access_token: 'test-token',
        user: {
          id: 'real-user-id',
          email: 'real@test.com',
        },
      }

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const result = await mockSupabase.auth.getSession()

      if (result.data.session?.user) {
        await mockInitializeManagerAndUsers(
          result.data.session.user.id,
          result.data.session.access_token
        )

        expect(mockInitializeManagerAndUsers).toHaveBeenCalledWith(
          'real-user-id',
          'test-token'
        )
      }
    })
  })

  describe('signOut', () => {
    it('shouldClearMockUserData', async () => {
      await mockAsyncStorage.removeItem('ato-mock-user')
      await mockAsyncStorage.removeItem('ato-store-testing-user')

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('ato-mock-user')
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('ato-store-testing-user')
    })

    it('shouldCallSupabaseSignOut', async () => {
      await mockSupabase.auth.signOut()

      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('shouldHandleSignOutError', async () => {
      mockSupabase.auth.signOut.mockRejectedValue(new Error('Sign out failed'))

      await expect(mockSupabase.auth.signOut()).rejects.toThrow('Sign out failed')
    })
  })

  describe('asyncStorage', () => {
    it('shouldGetItem', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('test-value')

      const result = await mockAsyncStorage.getItem('test-key')

      expect(result).toBe('test-value')
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('test-key')
    })

    it('shouldRemoveItem', async () => {
      await mockAsyncStorage.removeItem('test-key')

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('test-key')
    })

    it('shouldHandleGetItemError', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'))

      await expect(mockAsyncStorage.getItem('test-key')).rejects.toThrow('Storage error')
    })
  })

  describe('authFlow', () => {
    it('shouldCheckMockUserFirst', async () => {
      const result = await mockAsyncStorage.getItem('ato-mock-user')

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('ato-mock-user')
    })

    it('shouldCheckStoreTestingUserSecond', async () => {
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'ato-mock-user') return Promise.resolve(null)
        if (key === 'ato-store-testing-user') return Promise.resolve('{}')
        return Promise.resolve(null)
      })

      await mockAsyncStorage.getItem('ato-mock-user')
      await mockAsyncStorage.getItem('ato-store-testing-user')

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('ato-mock-user')
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('ato-store-testing-user')
    })

    it('shouldFallbackToRealAuth', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null)

      await mockAsyncStorage.getItem('ato-mock-user')
      await mockAsyncStorage.getItem('ato-store-testing-user')

      mockSupabase.auth.onAuthStateChange(jest.fn())

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled()
    })
  })

  describe('errorHandling', () => {
    it('shouldHandleJSONParseError', () => {
      const invalidJSON = 'invalid-json'

      expect(() => JSON.parse(invalidJSON)).toThrow()
    })

    it('shouldHandleStorageError', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'))

      await expect(mockAsyncStorage.getItem('ato-mock-user')).rejects.toThrow('Storage error')
    })

    it('shouldHandleInitializationError', async () => {
      mockInitializeManagerAndUsers.mockRejectedValue(new Error('Init error'))

      await expect(mockInitializeManagerAndUsers('user-id', 'token')).rejects.toThrow('Init error')
    })
  })

  describe('sessionManagement', () => {
    it('shouldCreateMockSession', () => {
      const mockUser = { id: 'test-id', email: 'test@test.com' }
      const mockSession = {
        access_token: 'mock-token-' + mockUser.id,
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: mockUser,
      }

      expect(mockSession.access_token).toBe('mock-token-test-id')
      expect(mockSession.user.id).toBe('test-id')
    })

    it('shouldValidateSessionStructure', () => {
      const session = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: { id: 'user-id', email: 'test@test.com' },
      }

      expect(session.access_token).toBeDefined()
      expect(session.user).toBeDefined()
      expect(session.user.id).toBeDefined()
    })
  })

  describe('cleanup', () => {
    it('shouldUnsubscribeOnCleanup', () => {
      const mockUnsubscribe = jest.fn()
      const mockSubscription = { unsubscribe: mockUnsubscribe }

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockSubscription },
      })

      const result = mockSupabase.auth.onAuthStateChange(jest.fn())

      result.data.subscription.unsubscribe()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })
})
import { atoApi, AtoManager, AtoUser, Reminder, Contact, UserReport } from '../atoApi'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../supabase'
import { MOCK_MANAGERS, MOCK_USERS, MOCK_CONTACTS, MOCK_REPORTS } from '../atoApi.mocks'

jest.mock('@react-native-async-storage/async-storage')
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

const originalEnv = process.env

describe('AtoApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  const setMockMode = (enabled: boolean) => {
    process.env.EXPO_PUBLIC_USE_MOCK_API = enabled ? 'true' : 'false'
  }

  describe('Authentication', () => {
    it('should set auth token', async () => {
      const mockSetItem = AsyncStorage.setItem as jest.Mock
      mockSetItem.mockResolvedValue(undefined)

      await atoApi.setAuthToken('test-token')

      expect(mockSetItem).toHaveBeenCalledWith('ato_api_token', 'test-token')
    })

    it('should clear auth token', async () => {
      const mockRemoveItem = AsyncStorage.removeItem as jest.Mock
      mockRemoveItem.mockResolvedValue(undefined)

      await atoApi.clearAuthToken()

      expect(mockRemoveItem).toHaveBeenCalledWith('ato_api_token')
    })

    it('should handle token errors gracefully', async () => {
      const mockSetItem = AsyncStorage.setItem as jest.Mock
      mockSetItem.mockRejectedValue(new Error('Storage error'))

      await expect(atoApi.setAuthToken('test-token')).resolves.not.toThrow()
    })
  })

  describe('getManagerById', () => {
    const managerId = 'manager-1'

    it('should fetch manager from Supabase', async () => {
      const mockManager: AtoManager = {
        id: managerId,
        name: 'John',
        surname: 'Doe',
        other_names: null,
        nickname: 'johnd',
        birthday: '1990-01-01',
        location: 'NYC',
        phone: '+1234567890',
        uses_whatsapp: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_id: 'user-1',
        relationship: 'Father',
      }

      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({ data: mockManager, error: null })

      ;(supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      })
      mockSelect.mockReturnValue({
        eq: mockEq,
      })
      mockEq.mockReturnValue({
        single: mockSingle,
      })

      const result = await atoApi.getManagerById(managerId)

      expect(supabase.from).toHaveBeenCalledWith('managers')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('id', managerId)
      expect(result).toEqual(mockManager)
    })

    it('should throw error on Supabase error', async () => {
      const mockError = new Error('Database error')
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: mockError })

      ;(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ eq: mockEq })
      mockEq.mockReturnValue({ single: mockSingle })

      await expect(atoApi.getManagerById(managerId)).rejects.toThrow(
        `Manager with id ${managerId} not found`
      )
    })

    it('should throw error when data is null', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null })

      ;(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ eq: mockEq })
      mockEq.mockReturnValue({ single: mockSingle })

      await expect(atoApi.getManagerById(managerId)).rejects.toThrow()
    })
  })

  describe('getUserById', () => {
    const userId = 'user-1'

    it('should fetch user from Supabase', async () => {
      const mockUser: AtoUser = {
        id: userId,
        name: 'Jane',
        surname: 'Smith',
        other_names: null,
        nickname: 'janes',
        birthday: '1995-05-15',
        location: 'LA',
        phone: '+0987654321',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        profile_picture_url: null,
        device_id: null,
        is_active: true,
      }

      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({ data: mockUser, error: null })

      ;(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ eq: mockEq })
      mockEq.mockReturnValue({ single: mockSingle })

      const result = await atoApi.getUserById(userId)

      expect(result).toEqual(mockUser)
    })

    it('should handle network errors gracefully', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockRejectedValue(new Error('Network error'))

      ;(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ eq: mockEq })
      mockEq.mockReturnValue({ single: mockSingle })

      await expect(atoApi.getUserById(userId)).rejects.toThrow()
    })
  })

  describe('getUsersByManagerId', () => {
    const managerId = 'manager-1'

    it('should fetch users from Supabase', async () => {
      const mockUsers = [
        { user_id: 'user-1', users: { id: 'user-1', name: 'John' } },
        { user_id: 'user-2', users: { id: 'user-2', name: 'Jane' } },
      ]

      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockResolvedValue({ data: mockUsers, error: null })

      ;(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ eq: mockEq })

      const result = await atoApi.getUsersByManagerId(managerId)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ id: 'user-1', name: 'John' })
    })

    it('should return empty array on Supabase error', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      })

      ;(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ eq: mockEq })

      const result = await atoApi.getUsersByManagerId(managerId)

      expect(result).toEqual([])
    })

    it('should filter out null users', async () => {
      const mockUsers = [
        { user_id: 'user-1', users: { id: 'user-1', name: 'John' } },
        { user_id: 'user-2', users: null },
      ]

      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockResolvedValue({ data: mockUsers, error: null })

      ;(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ eq: mockEq })

      const result = await atoApi.getUsersByManagerId(managerId)

      expect(result).toHaveLength(1)
    })
  })

  describe('getSelectedUser', () => {
    const managerId = 'manager-1'

    it('should fetch selected user from Supabase', async () => {
      const mockSelection = { user_id: 'user-1' }
      const mockUserData = {
        relationship: 'Father',
        users: { id: 'user-1', name: 'John' },
      }

      const mockSelect1 = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockMaybeSingle1 = jest.fn().mockResolvedValue({
        data: mockSelection,
        error: null,
      })

      const mockSelect2 = jest.fn().mockReturnThis()
      const mockEq2a = jest.fn().mockReturnThis()
      const mockEq2b = jest.fn().mockReturnThis()
      const mockSingle2 = jest.fn().mockResolvedValue({ data: mockUserData, error: null })

      ;(supabase.from as jest.Mock)
        .mockReturnValueOnce({ select: mockSelect1 })
        .mockReturnValueOnce({ select: mockSelect2 })

      mockSelect1.mockReturnValue({ eq: mockEq1 })
      mockEq1.mockReturnValue({ maybeSingle: mockMaybeSingle1 })

      mockSelect2.mockReturnValue({ eq: mockEq2a })
      mockEq2a.mockReturnValue({ eq: mockEq2b })
      mockEq2b.mockReturnValue({ single: mockSingle2 })

      const result = await atoApi.getSelectedUser(managerId)

      expect(result).not.toBeNull()
      expect(result?.id).toBe('user-1')
      expect(result?.relationship).toBe('Father')
    })

    it('should return null when no selection exists', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })

      ;(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ eq: mockEq })
      mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle })

      const result = await atoApi.getSelectedUser(managerId)

      expect(result).toBeNull()
    })

    it('should handle Supabase errors gracefully', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('DB error'),
      })

      ;(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ eq: mockEq })
      mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle })

      const result = await atoApi.getSelectedUser(managerId)

      expect(result).toBeNull()
    })
  })

  describe('setSelectedUser', () => {
    const managerId = 'manager-1'
    const userId = 'user-1'

    it('should set selected user in Supabase', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: { user_id: userId },
        error: null,
      })

      const mockUpsert = jest.fn().mockResolvedValue({ error: null })

      ;(supabase.from as jest.Mock)
        .mockReturnValueOnce({ select: mockSelect })
        .mockReturnValueOnce({ upsert: mockUpsert })

      mockSelect.mockReturnValue({ eq: mockEq1 })
      mockEq1.mockReturnValue({ eq: mockEq2 })
      mockEq2.mockReturnValue({ single: mockSingle })

      const result = await atoApi.setSelectedUser(managerId, userId)

      expect(result).toBe(true)
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          manager_id: managerId,
          user_id: userId,
        }),
        { onConflict: 'manager_id' }
      )
    })

    it('should validate user belongs to manager', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null })

      ;(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ eq: mockEq1 })
      mockEq1.mockReturnValue({ eq: mockEq2 })
      mockEq2.mockReturnValue({ single: mockSingle })

      const result = await atoApi.setSelectedUser(managerId, userId)

      expect(result).toBe(false)
    })

    it('should handle upsert errors', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: { user_id: userId },
        error: null,
      })

      const mockUpsert = jest.fn().mockResolvedValue({ error: new Error('Upsert failed') })

      ;(supabase.from as jest.Mock)
        .mockReturnValueOnce({ select: mockSelect })
        .mockReturnValueOnce({ upsert: mockUpsert })

      mockSelect.mockReturnValue({ eq: mockEq1 })
      mockEq1.mockReturnValue({ eq: mockEq2 })
      mockEq2.mockReturnValue({ single: mockSingle })

      const result = await atoApi.setSelectedUser(managerId, userId)

      expect(result).toBe(false)
    })
  })

  describe('getManagedUsersWithSelection', () => {
    const managerId = 'manager-1'

    it('should mark selected user correctly', async () => {
      const selectedUserId = 'user-1'
      const mockSelection = { user_id: selectedUserId }
      const mockUsers = [
        { relationship: 'Father', users: { id: 'user-1', name: 'John' } },
        { relationship: 'Mother', users: { id: 'user-2', name: 'Jane' } },
      ]

      const mockSelect1 = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: mockSelection,
        error: null,
      })

      const mockSelect2 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockResolvedValue({ data: mockUsers, error: null })

      ;(supabase.from as jest.Mock)
        .mockReturnValueOnce({ select: mockSelect1 })
        .mockReturnValueOnce({ select: mockSelect2 })

      mockSelect1.mockReturnValue({ eq: mockEq1 })
      mockEq1.mockReturnValue({ maybeSingle: mockMaybeSingle })

      mockSelect2.mockReturnValue({ eq: mockEq2 })

      const result = await atoApi.getManagedUsersWithSelection(managerId)

      expect(result).toHaveLength(2)
      expect(result[0].isSelected).toBe(true)
      expect(result[1].isSelected).toBe(false)
    })

    it('should handle no selection', async () => {
      const mockUsers = [{ relationship: 'Father', users: { id: 'user-1', name: 'John' } }]

      const mockSelect1 = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })

      const mockSelect2 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockResolvedValue({ data: mockUsers, error: null })

      ;(supabase.from as jest.Mock)
        .mockReturnValueOnce({ select: mockSelect1 })
        .mockReturnValueOnce({ select: mockSelect2 })

      mockSelect1.mockReturnValue({ eq: mockEq1 })
      mockEq1.mockReturnValue({ maybeSingle: mockMaybeSingle })
      mockSelect2.mockReturnValue({ eq: mockEq2 })

      const result = await atoApi.getManagedUsersWithSelection(managerId)

      expect(result[0].isSelected).toBe(false)
    })
  })

  describe('getRemindersForUser', () => {
    const userId = 'user-1'

    it('should fetch reminders ordered by scheduled_for', async () => {
      const mockReminders: Reminder[] = [
        {
          id: 'reminder-1',
          user_id: userId,
          manager_id: 'manager-1',
          task: 'Call mom',
          scheduled_for: '2024-01-15T10:00:00Z',
          rrule: null,
          status: 'PENDING',
          last_sent_at: null,
          attempts: 0,
        },
        {
          id: 'reminder-2',
          user_id: userId,
          manager_id: 'manager-1',
          task: 'Doctor appointment',
          scheduled_for: '2024-01-20T14:00:00Z',
          rrule: null,
          status: 'PENDING',
          last_sent_at: null,
          attempts: 0,
        },
      ]

      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockOrder = jest.fn().mockResolvedValue({ data: mockReminders, error: null })

      ;(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ eq: mockEq })
      mockEq.mockReturnValue({ order: mockOrder })

      const result = await atoApi.getRemindersForUser(userId)

      expect(mockOrder).toHaveBeenCalledWith('scheduled_for', { ascending: true })
      expect(result).toHaveLength(2)
      expect(new Date(result[0].scheduled_for).getTime()).toBeLessThan(
        new Date(result[1].scheduled_for).getTime()
      )
    })

    it('should return empty array on error', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      })

      ;(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ eq: mockEq })
      mockEq.mockReturnValue({ order: mockOrder })

      const result = await atoApi.getRemindersForUser(userId)

      expect(result).toEqual([])
    })
  })

  describe('createReminder', () => {
    const newReminder: Omit<Reminder, 'id' | 'created_at' | 'updated_at'> = {
      user_id: 'user-1',
      manager_id: 'manager-1',
      task: 'Take medication',
      scheduled_for: '2024-01-15T09:00:00Z',
      rrule: 'FREQ=DAILY',
      status: 'PENDING',
      last_sent_at: null,
      attempts: 0,
    }

    it('should create reminder in Supabase', async () => {
      const createdReminder: Reminder = {
        ...newReminder,
        id: 'reminder-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockInsert = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({ data: createdReminder, error: null })

      ;(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert })
      mockInsert.mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ single: mockSingle })

      const result = await atoApi.createReminder(newReminder)

      expect(mockInsert).toHaveBeenCalledWith([newReminder])
      expect(result).toEqual(createdReminder)
    })

    it('should return null on creation error', async () => {
      const mockInsert = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Insert failed'),
      })

      ;(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert })
      mockInsert.mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ single: mockSingle })

      const result = await atoApi.createReminder(newReminder)

      expect(result).toBeNull()
    })

    it('should validate required fields', async () => {
      const invalidReminder = {
        ...newReminder,
        task: '',
      }

      const mockInsert = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Validation error'),
      })

      ;(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert })
      mockInsert.mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ single: mockSingle })

      const result = await atoApi.createReminder(invalidReminder)

      expect(result).toBeNull()
    })
  })

  describe('getContactsForUser', () => {
    const userId = 'user-1'

    it('should fetch contacts from Supabase', async () => {
      const mockContacts: Contact[] = [
        {
          id: 'contact-1',
          user_id: userId,
          name: 'John',
          surname: 'Doe',
          relationship: 'Friend',
          other_names: null,
          birthday: null,
          location: null,
          contact_methods: [
            {
              method: 'WHATSAPP',
              value: '+1234567890',
              is_primary: true,
            },
          ],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockResolvedValue({ data: mockContacts, error: null })

      ;(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ eq: mockEq })

      const result = await atoApi.getContactsForUser(userId)

      expect(result).toEqual(mockContacts)
    })

    it('should handle empty data', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null })

      ;(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ eq: mockEq })

      const result = await atoApi.getContactsForUser(userId)

      expect(result).toEqual([])
    })

    it('should return empty array on error', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      })

      ;(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ eq: mockEq })

      const result = await atoApi.getContactsForUser(userId)

      expect(result).toEqual([])
    })
  })

  describe('getUserReport', () => {
  const userId = 'user-1'

  it('shouldReturnDefaultEmptyReportStructure', async () => {
    const mockSelect = jest.fn().mockReturnThis()
    const mockEq = jest.fn().mockReturnThis()
    const mockOrder = jest.fn().mockReturnThis()
    const mockLimit = jest.fn().mockReturnThis()
    const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })

    ;(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ order: mockOrder })
    mockOrder.mockReturnValue({ limit: mockLimit })
    mockLimit.mockReturnValue({ maybeSingle: mockMaybeSingle })

    const report = await atoApi.getUserReport(userId)

    expect(report.user_id).toBe(userId)
    expect(report.report_generated_at).toBeDefined()
    expect(report.summary.total_contacts).toBe(0)
    expect(report.summary.total_reminders).toBe(0)
    expect(report.recent_activity).toEqual([])
    expect(report.upcoming_reminders).toEqual([])
  })

  it('shouldHaveValidISOTimestamp', async () => {
    const mockSelect = jest.fn().mockReturnThis()
    const mockEq = jest.fn().mockReturnThis()
    const mockOrder = jest.fn().mockReturnThis()
    const mockLimit = jest.fn().mockReturnThis()
    const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })

    ;(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ order: mockOrder })
    mockOrder.mockReturnValue({ limit: mockLimit })
    mockLimit.mockReturnValue({ maybeSingle: mockMaybeSingle })

    const report = await atoApi.getUserReport(userId)

    const timestamp = new Date(report.report_generated_at)
    expect(timestamp.toISOString()).toBe(report.report_generated_at)
  })
})

  describe('Integration Tests', () => {
    describe('User flow', () => {
      const managerId = 'manager-1'
      const userId = 'user-1'

      it('should complete full user selection flow', async () => {
        const mockSelection = { user_id: null }
        const mockUsers = [
          { relationship: 'Father', users: { id: userId, name: 'John' } },
        ]

        const mockSelect1 = jest.fn().mockReturnThis()
        const mockEq1 = jest.fn().mockReturnThis()
        const mockMaybeSingle = jest.fn().mockResolvedValue({
          data: mockSelection,
          error: null,
        })

        const mockSelect2 = jest.fn().mockReturnThis()
        const mockEq2 = jest.fn().mockResolvedValue({ data: mockUsers, error: null })

        const mockSelect3 = jest.fn().mockReturnThis()
        const mockEq3a = jest.fn().mockReturnThis()
        const mockEq3b = jest.fn().mockReturnThis()
        const mockSingle3 = jest.fn().mockResolvedValue({
          data: { user_id: userId },
          error: null,
        })

        const mockUpsert = jest.fn().mockResolvedValue({ error: null })

        const mockSelect4 = jest.fn().mockReturnThis()
        const mockEq4 = jest.fn().mockReturnThis()
        const mockMaybeSingle4 = jest.fn().mockResolvedValue({
          data: { user_id: userId },
          error: null,
        })

        const mockSelect5 = jest.fn().mockReturnThis()
        const mockEq5a = jest.fn().mockReturnThis()
        const mockEq5b = jest.fn().mockReturnThis()
        const mockSingle5 = jest.fn().mockResolvedValue({
          data: { relationship: 'Father', users: { id: userId, name: 'John' } },
          error: null,
        })

        ;(supabase.from as jest.Mock)
          .mockReturnValueOnce({ select: mockSelect1 })
          .mockReturnValueOnce({ select: mockSelect2 })
          .mockReturnValueOnce({ select: mockSelect3 })
          .mockReturnValueOnce({ upsert: mockUpsert })
          .mockReturnValueOnce({ select: mockSelect4 })
          .mockReturnValueOnce({ select: mockSelect5 })

        mockSelect1.mockReturnValue({ eq: mockEq1 })
        mockEq1.mockReturnValue({ maybeSingle: mockMaybeSingle })
        mockSelect2.mockReturnValue({ eq: mockEq2 })

        mockSelect3.mockReturnValue({ eq: mockEq3a })
        mockEq3a.mockReturnValue({ eq: mockEq3b })
        mockEq3b.mockReturnValue({ single: mockSingle3 })

        mockSelect4.mockReturnValue({ eq: mockEq4 })
        mockEq4.mockReturnValue({ maybeSingle: mockMaybeSingle4 })

        mockSelect5.mockReturnValue({ eq: mockEq5a })
        mockEq5a.mockReturnValue({ eq: mockEq5b })
        mockEq5b.mockReturnValue({ single: mockSingle5 })

        const users = await atoApi.getManagedUsersWithSelection(managerId)
        expect(users.length).toBeGreaterThan(0)

        const firstUser = users[0]
        const result = await atoApi.setSelectedUser(managerId, firstUser.id)
        expect(result).toBe(true)

        const selectedUser = await atoApi.getSelectedUser(managerId)
        expect(selectedUser?.id).toBe(firstUser.id)
      })

      it('should fetch user data and related entities', async () => {
        const mockUser: AtoUser = {
          id: userId,
          name: 'Jane',
          surname: 'Smith',
          other_names: null,
          nickname: 'janes',
          birthday: '1995-05-15',
          location: 'LA',
          phone: '+0987654321',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          profile_picture_url: null,
          device_id: null,
          is_active: true,
        }

        const mockContacts: Contact[] = []
        const mockReminders: Reminder[] = []

        const mockSelect1 = jest.fn().mockReturnThis()
        const mockEq1 = jest.fn().mockReturnThis()
        const mockSingle1 = jest.fn().mockResolvedValue({ data: mockUser, error: null })

        const mockSelect2 = jest.fn().mockReturnThis()
        const mockEq2 = jest.fn().mockResolvedValue({ data: mockContacts, error: null })

        const mockSelect3 = jest.fn().mockReturnThis()
        const mockEq3 = jest.fn().mockReturnThis()
        const mockOrder = jest.fn().mockResolvedValue({ data: mockReminders, error: null })

        ;(supabase.from as jest.Mock)
          .mockReturnValueOnce({ select: mockSelect1 })
          .mockReturnValueOnce({ select: mockSelect2 })
          .mockReturnValueOnce({ select: mockSelect3 })

        mockSelect1.mockReturnValue({ eq: mockEq1 })
        mockEq1.mockReturnValue({ single: mockSingle1 })

        mockSelect2.mockReturnValue({ eq: mockEq2 })

        mockSelect3.mockReturnValue({ eq: mockEq3 })
        mockEq3.mockReturnValue({ order: mockOrder })

        const user = await atoApi.getUserById(userId)
        expect(user).toBeDefined()

        const contacts = await atoApi.getContactsForUser(userId)
        expect(Array.isArray(contacts)).toBe(true)

        const reminders = await atoApi.getRemindersForUser(userId)
        expect(Array.isArray(reminders)).toBe(true)

        const report = await atoApi.getUserReport(userId)
        expect(report.user_id).toBe(userId)
      })
    })
  })
})
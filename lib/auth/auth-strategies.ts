import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../supabase'
import { atoApi } from '../ato-api'
import { AuthStrategy } from './types'
import { MockUserFactory } from './mock-user-factory'

const MOCK_OTP_CODE = '123456'
const LEGACY_TEST_EMAIL = 'gaspi+store-testing@ato.ar'
const LEGACY_TEST_CODE = '181302'
const LEGACY_MANAGER_ID = '32d49772-89e0-4f23-a80d-b3211888d3a2'

export class MockAuthStrategy implements AuthStrategy {
  private useMockMode: boolean

  constructor() {
    this.useMockMode =
      process.env.EXPO_PUBLIC_USE_MOCK_API === 'true' || !process.env.EXPO_PUBLIC_API_BASE_URL
  }

  canHandle(_email: string, otpCode: string): boolean {
    return this.useMockMode && otpCode === MOCK_OTP_CODE
  }

  async authenticate(email: string, _otpCode: string): Promise<void> {
    await this.delay(1000)

    const { managerId, mockEmail } = MockUserFactory.getManagerIdFromEmail(email)
    const mockUser = MockUserFactory.createMockUser(managerId, mockEmail)

    await AsyncStorage.setItem('ato-mock-user', JSON.stringify(mockUser))
    await atoApi.setAuthToken('mock-token-' + managerId)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export class LegacyTestAuthStrategy implements AuthStrategy {
  canHandle(email: string, otpCode: string): boolean {
    return email === LEGACY_TEST_EMAIL && otpCode === LEGACY_TEST_CODE
  }

  async authenticate(_email: string, _otpCode: string): Promise<void> {
    await this.delay(1000)

    const mockUser = MockUserFactory.createMockUser(LEGACY_MANAGER_ID, LEGACY_TEST_EMAIL)
    await AsyncStorage.setItem('ato-store-testing-user', JSON.stringify(mockUser))
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export class SupabaseAuthStrategy implements AuthStrategy {
  canHandle(_email: string, _otpCode: string): boolean {
    return true
  }

  async authenticate(email: string, otpCode: string): Promise<void> {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'email',
    })

    if (error) {
      throw new Error('VERIFICATION_ERROR')
    }
  }
}

export class AuthStrategyResolver {
  private strategies: AuthStrategy[]

  constructor() {
    this.strategies = [
      new MockAuthStrategy(),
      new LegacyTestAuthStrategy(),
      new SupabaseAuthStrategy(),
    ]
  }

  resolve(email: string, otpCode: string): AuthStrategy {
    const strategy = this.strategies.find(s => s.canHandle(email, otpCode))

    if (!strategy) {
      throw new Error('No authentication strategy found')
    }

    return strategy
  }
}

import { User } from '@supabase/supabase-js'

export interface AuthStrategy {
  canHandle(email: string, otpCode: string): boolean
  authenticate(email: string, otpCode: string): Promise<void>
}

export type AuthUser = User

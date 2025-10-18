import { User } from '@supabase/supabase-js'
import { MOCK_IDS } from '../atoApi'

export class MockUserFactory {
  static createMockUser(managerId: string, email: string): User {
    const now = new Date().toISOString()

    return {
      id: managerId,
      email,
      email_confirmed_at: now,
      created_at: now,
      updated_at: now,
      user_metadata: { manager_id: managerId },
      app_metadata: {},
      aud: 'authenticated',
      confirmation_sent_at: now,
      recovery_sent_at: now,
      email_change_sent_at: now,
      new_email: undefined,
      invited_at: undefined,
      action_link: undefined,
      phone: undefined,
      phone_confirmed_at: undefined,
      phone_change_sent_at: undefined,
      confirmed_at: now,
      email_change_confirm_status: 0,
      banned_until: undefined,
      reauthentication_sent_at: undefined,
      is_anonymous: false,
    } as User
  }

  static getManagerIdFromEmail(email: string): { managerId: string; mockEmail: string } {
    const emailLower = email.toLowerCase()

    if (emailLower.includes('carlos')) {
      return { managerId: MOCK_IDS.managers.carlos, mockEmail: 'carlos@ato.ar' }
    }

    return { managerId: MOCK_IDS.managers.maria, mockEmail: 'maria@ato.ar' }
  }
}

import type { AtoManager, AtoUser, UserReport, Contact } from './atoApi'

/**
 * Mock data for development without backend
 * This file contains realistic sample data for testing the app
 */

export const MOCK_USERS: Record<string, AtoUser> = {
  'mock-user-1': {
    id: 'mock-user-1',
    name: 'Antonio',
    surname: 'García Fernández',
    other_names: 'José',
    nickname: 'Toño',
    birthday: '1950-08-12',
    location: 'Madrid, España',
    phone: '+34645123456',
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-10-10T08:30:00Z',
    profile_picture_url: null,
    device_id: 'ato-device-001',
    is_active: true,
  },
  'mock-user-2': {
    id: 'mock-user-2',
    name: 'Carmen',
    surname: 'Rodríguez López',
    other_names: 'María',
    nickname: 'Carmencita',
    birthday: '1948-11-25',
    location: 'Barcelona, España',
    phone: '+34656234567',
    created_at: '2024-02-15T14:20:00Z',
    updated_at: '2024-10-09T16:45:00Z',
    profile_picture_url: null,
    device_id: 'ato-device-002',
    is_active: true,
  },
}

export const MOCK_MANAGERS: Record<string, AtoManager> = {
  'mock-manager-1': {
    id: 'mock-manager-1',
    name: 'Maria',
    surname: 'Garcia Lopez',
    other_names: 'Teresa',
    nickname: 'Mari',
    birthday: '1985-03-15',
    location: 'Madrid, Espa�a',
    phone: '+34612345678',
    uses_whatsapp: true,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-10-01T14:22:00Z',
    user_id: 'mock-user-1',
    relationship: 'hija',
  },
  'mock-manager-2': {
    id: 'mock-manager-2',
    name: 'Carlos',
    surname: 'Rodr�guez Mart�n',
    other_names: null,
    nickname: 'Carlitos',
    birthday: '1978-07-22',
    location: 'Barcelona, Espa�a',
    phone: '+34623456789',
    uses_whatsapp: true,
    created_at: '2024-02-10T09:15:00Z',
    updated_at: '2024-09-28T16:45:00Z',
    user_id: 'mock-user-2',
    relationship: 'hijo',
  },
}

export const MOCK_REPORTS: Record<string, UserReport> = {
  'mock-user-1': {
    user_id: 'mock-user-1',
    report_generated_at: new Date().toISOString(),
    summary: {
      total_contacts: 8,
      total_reminders: 15,
      active_reminders: 6,
      completed_reminders: 9,
    },
    recent_activity: [
      {
        type: 'reminder_completed',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        description: 'Recordatorio "Tomar medicaci�n" completado',
      },
      {
        type: 'contact_called',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        description: 'Llamada realizada a Mar�a Garc�a',
      },
      {
        type: 'reminder_created',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        description: 'Nuevo recordatorio "Cita m�dica" creado',
      },
      {
        type: 'voice_message',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        description: 'Mensaje de voz recibido de Carlos',
      },
    ],
    upcoming_reminders: [
      {
        id: 'reminder-1',
        task: 'Tomar medicaci�n de la ma�ana',
        scheduled_for: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'reminder-2',
        task: 'Cita con el m�dico - Dr. P�rez',
        scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'reminder-3',
        task: 'Llamar a los nietos',
        scheduled_for: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'reminder-4',
        task: 'Hacer ejercicios de rehabilitaci�n',
        scheduled_for: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  'mock-user-2': {
    user_id: 'mock-user-2',
    report_generated_at: new Date().toISOString(),
    summary: {
      total_contacts: 12,
      total_reminders: 22,
      active_reminders: 8,
      completed_reminders: 14,
    },
    recent_activity: [
      {
        type: 'reminder_completed',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        description: 'Recordatorio "Desayuno" completado',
      },
      {
        type: 'contact_called',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        description: 'Llamada realizada a Ana Rodr�guez',
      },
    ],
    upcoming_reminders: [
      {
        id: 'reminder-5',
        task: 'Tomar pastillas del almuerzo',
        scheduled_for: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'reminder-6',
        task: 'Paseo por el parque',
        scheduled_for: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
}

export const MOCK_CONTACTS: Record<string, Contact[]> = {
  'mock-user-1': [
    {
      id: 'contact-1',
      user_id: 'mock-user-1',
      name: 'María',
      surname: 'García López',
      relationship: 'Hija',
      other_names: ['Mari'],
      birthday: '1985-03-15',
      location: 'Madrid, España',
      contact_methods: [
        {
          method: 'PHONE',
          value: '+34612345678',
          is_primary: true,
          description: 'Teléfono personal',
        },
        {
          method: 'WHATSAPP',
          value: '+34612345678',
          is_primary: false,
          description: 'WhatsApp',
        },
      ],
      created_at: '2024-01-20T10:00:00Z',
      updated_at: '2024-10-10T08:30:00Z',
    },
    {
      id: 'contact-2',
      user_id: 'mock-user-1',
      name: 'Carlos',
      surname: 'García Fernández',
      relationship: 'Hijo',
      other_names: ['Carlitos'],
      birthday: '1982-07-22',
      location: 'Barcelona, España',
      contact_methods: [
        {
          method: 'WHATSAPP',
          value: '+34623456789',
          is_primary: true,
          description: 'WhatsApp principal',
        },
      ],
      created_at: '2024-01-22T11:00:00Z',
      updated_at: '2024-10-09T16:45:00Z',
    },
    {
      id: 'contact-3',
      user_id: 'mock-user-1',
      name: 'Dr. Pérez',
      surname: 'González',
      relationship: 'Médico de familia',
      other_names: null,
      birthday: null,
      location: 'Centro de Salud Madrid Centro',
      contact_methods: [
        {
          method: 'PHONE',
          value: '+34915123456',
          is_primary: true,
          description: 'Consulta',
        },
      ],
      created_at: '2024-02-10T09:15:00Z',
      updated_at: '2024-09-28T16:45:00Z',
    },
    {
      id: 'contact-4',
      user_id: 'mock-user-1',
      name: 'Ana',
      surname: 'Martínez',
      relationship: 'Nieta',
      other_names: ['Anita'],
      birthday: '2005-11-10',
      location: 'Madrid, España',
      contact_methods: [
        {
          method: 'WHATSAPP',
          value: '+34656789012',
          is_primary: true,
          description: 'WhatsApp',
        },
        {
          method: 'SMS',
          value: '+34656789012',
          is_primary: false,
          description: 'SMS',
        },
      ],
      created_at: '2024-03-05T14:20:00Z',
      updated_at: '2024-10-08T12:30:00Z',
    },
  ],
  'mock-user-2': [
    {
      id: 'contact-5',
      user_id: 'mock-user-2',
      name: 'Carlos',
      surname: 'Rodríguez Martín',
      relationship: 'Hijo',
      other_names: ['Carlitos'],
      birthday: '1978-07-22',
      location: 'Barcelona, España',
      contact_methods: [
        {
          method: 'PHONE',
          value: '+34623456789',
          is_primary: true,
          description: 'Móvil personal',
        },
        {
          method: 'WHATSAPP',
          value: '+34623456789',
          is_primary: false,
          description: 'WhatsApp',
        },
      ],
      created_at: '2024-02-15T14:20:00Z',
      updated_at: '2024-10-09T16:45:00Z',
    },
    {
      id: 'contact-6',
      user_id: 'mock-user-2',
      name: 'Laura',
      surname: 'Rodríguez Sánchez',
      relationship: 'Hija',
      other_names: null,
      birthday: '1980-05-18',
      location: 'Valencia, España',
      contact_methods: [
        {
          method: 'WHATSAPP',
          value: '+34634567890',
          is_primary: true,
          description: 'WhatsApp principal',
        },
      ],
      created_at: '2024-02-16T10:00:00Z',
      updated_at: '2024-10-07T09:20:00Z',
    },
  ],
}

/**
 * Easy-to-use mock IDs for development
 * Use these constants instead of hardcoding IDs
 *
 * @example
 * ```typescript
 * import { MOCK_IDS } from '@/lib/atoApi.mocks'
 * const manager = await atoApi.getManagerById(MOCK_IDS.managers.maria)
 * ```
 */
export const MOCK_IDS = {
  managers: {
    maria: 'mock-manager-1',
    carlos: 'mock-manager-2',
  },
  users: {
    senior1: 'mock-user-1',
    senior2: 'mock-user-2',
  },
} as const

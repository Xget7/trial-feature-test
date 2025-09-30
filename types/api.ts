export interface ApiError {
  message: string
  status?: number
  code?: string
}

export interface LoadingState {
  loading: boolean
  error: string | null
}

export interface ContactFormData {
  name: string
  surname: string
  relationship: string
  other_names?: string[]
  birthday?: string
  location?: string
  contact_methods: {
    method: 'WHATSAPP' | 'SMS' | 'EMAIL' | 'PHONE'
    value: string
    is_primary: boolean
    description?: string
  }[]
}

export interface ContactDisplayInfo {
  name: string
  subtitle: string
  location: string
  phone: string
}

export const CATEGORIES = [
  { value: 'romantic', emoji: '❤️', label: 'Romantic' },
  { value: 'food', emoji: '🍜', label: 'Food' },
  { value: 'travel', emoji: '✈️', label: 'Travel' },
  { value: 'photo', emoji: '📸', label: 'Photo' },
  { value: 'birthday', emoji: '🎂', label: 'Birthday' },
  { value: 'important', emoji: '⭐', label: 'Important' },
] as const

export type Category = (typeof CATEGORIES)[number]['value']

export function categoryEmoji(category?: string | null): string {
  return CATEGORIES.find((c) => c.value === category)?.emoji ?? '📍'
}

export interface Photo {
  id: number
  image_url: string
}

export interface Memory {
  id: number
  title: string
  description: string | null
  date: string | null
  latitude: number
  longitude: number
  location_name: string | null
  category: string | null
  created_by: number
  created_by_name?: string | null
  created_at: string
  updated_at: string
  photos: Photo[]
}

export interface User {
  id: number
  name: string
  email: string
  avatar_url: string | null
  couple_id: number
  partner_name: string | null
  invite_code: string
  drive_connected: boolean
}

export interface AuthResponse {
  token: string
  user: User
}

export interface SearchResult {
  display_name: string
  lat: string
  lon: string
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AdminUserDetails } from '@/api/generated/model'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AdminUserDetails | null
  isAuthenticated: boolean
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: AdminUserDetails) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken, isAuthenticated: true })
      },

      setUser: (user: AdminUserDetails) => {
        set({ user })
      },

      logout: () => {
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)

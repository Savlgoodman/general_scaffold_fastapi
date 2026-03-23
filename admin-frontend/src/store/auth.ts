import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MenuVO, UserVO } from '@/api/generated/model'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserVO | null
  menus: MenuVO[]
  devMode: boolean
  isAuthenticated: boolean
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: UserVO) => void
  setMenus: (menus: MenuVO[]) => void
  setLoginData: (accessToken: string, refreshToken: string, user: UserVO, menus: MenuVO[]) => void
  toggleDevMode: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      menus: [],
      devMode: true,
      isAuthenticated: false,

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken, isAuthenticated: true })
      },

      setUser: (user: UserVO) => {
        set({ user })
      },

      setMenus: (menus: MenuVO[]) => {
        set({ menus })
      },

      setLoginData: (accessToken: string, refreshToken: string, user: UserVO, menus: MenuVO[]) => {
        set({ accessToken, refreshToken, user, menus, isAuthenticated: true })
      },

      toggleDevMode: () => {
        set((state) => ({ devMode: !state.devMode }))
      },

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          menus: [],
          isAuthenticated: false,
        })
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserInfo } from '@/services/auth'

interface AuthState {
  token: string | null
  user: UserInfo | null
  isAuthenticated: boolean
  setAuth: (token: string, user: UserInfo) => void
  logout: () => void
  checkAuth: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => {
        localStorage.setItem('auth_token', token)
        localStorage.setItem('user_info', JSON.stringify(user))
        set({ token, user, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_info')
        set({ token: null, user: null, isAuthenticated: false })
      },
      checkAuth: () => {
        const token = localStorage.getItem('auth_token')
        const userStr = localStorage.getItem('user_info')
        if (token && userStr) {
          try {
            const user = JSON.parse(userStr) as UserInfo
            set({ token, user, isAuthenticated: true })
            return true
          } catch {
            get().logout()
            return false
          }
        }
        return get().isAuthenticated
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)

'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { decodeUser, clearToken, isAuthenticated, type DecodedUser } from '@/lib/auth'

interface AuthContextValue {
  user: DecodedUser | null
  isLoaded: boolean
  logout: () => void
  refreshUser: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoaded: false,
  logout: () => {},
  refreshUser: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<DecodedUser | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  const refreshUser = useCallback(() => {
    setUser(decodeUser())
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
      return
    }
    setUser(decodeUser())
    setIsLoaded(true)
  }, [router])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ user, isLoaded, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

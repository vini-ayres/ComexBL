import * as React from "react"
import type { PerfilUsuario } from "@/types"
import {
  fetchCurrentUser,
  hasAnyPermission,
  hasPermission,
  loginWithActiveDirectory,
  logoutFromApi,
  type AuthUserResponse,
} from "@/lib/api/auth"
import { setAuthToken, getAuthToken, setUnauthorizedHandler } from "@/lib/api/client"
import { ApiError } from "@/lib/api/client"

export interface AuthUser {
  id: number
  nome: string
  login: string
  email: string
  perfil: PerfilUsuario
  grupoAD: string
  permissoes: string[]
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  loginWithLdap: (login: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  refreshUser: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = "comexbl_auth_user"

function mapAuthUser(data: AuthUserResponse): AuthUser {
  return {
    id: data.id,
    nome: data.nome,
    login: data.login,
    email: data.email,
    perfil: data.perfil,
    grupoAD: data.grupoAD,
    permissoes: data.permissoes,
  }
}

function readStoredUser(): AuthUser | null {
  try {
    if (!getAuthToken()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function clearStoredSession(): void {
  setAuthToken(null)
  localStorage.removeItem(STORAGE_KEY)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(() => readStoredUser())
  const [isLoading, setIsLoading] = React.useState(true)

  const persistUser = React.useCallback((nextUser: AuthUser | null) => {
    if (nextUser && getAuthToken()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    setUser(nextUser)
  }, [])

  const logout = React.useCallback(async () => {
    try {
      await logoutFromApi()
    } finally {
      clearStoredSession()
      setUser(null)
    }
  }, [])

  const refreshUser = React.useCallback(async () => {
    if (!getAuthToken()) {
      clearStoredSession()
      setUser(null)
      return
    }

    try {
      const current = await fetchCurrentUser()
      persistUser(mapAuthUser(current))
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        clearStoredSession()
        setUser(null)
      }
    }
  }, [persistUser])

  React.useEffect(() => {
    setUnauthorizedHandler(() => {
      clearStoredSession()
      setUser(null)
    })

    return () => setUnauthorizedHandler(null)
  }, [])

  React.useEffect(() => {
    void (async () => {
      try {
        if (getAuthToken()) {
          await refreshUser()
        } else {
          clearStoredSession()
          setUser(null)
        }
      } finally {
        setIsLoading(false)
      }
    })()
  }, [refreshUser])

  const loginWithLdap = React.useCallback(async (login: string, password: string) => {
    if (!login || !password) {
      return { ok: false, error: "Informe usuário e senha de rede." }
    }

    try {
      const result = await loginWithActiveDirectory(login, password)
      persistUser(mapAuthUser(result.user))
      return { ok: true }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Erro ao autenticar no Active Directory."
      return { ok: false, error: message }
    }
  }, [persistUser])

  const value: AuthContextValue = {
    user,
    isAuthenticated: Boolean(user && getAuthToken()),
    isLoading,
    loginWithLdap,
    logout,
    hasPermission: (permission) => hasPermission(user, permission),
    hasAnyPermission: (permissions) => hasAnyPermission(user, permissions),
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider")
  return ctx
}

import * as React from "react"
import type { PerfilUsuario } from "@/types"

interface AuthUser {
  nome: string
  login: string
  email: string
  perfil: PerfilUsuario
  grupoAD: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  loginWithLdap: (login: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = "comexbl_auth_user"

// Usuário de teste fixo para acesso ao protótipo (simula um registro
// já sincronizado via grupo do Active Directory: GG_COMEX_ADMIN).
// A validação real de credenciais ocorre no backend contra o LDAP/AD.
export const TEST_USER_CREDENTIALS = {
  login: "teste",
  password: "teste123",
}

const TEST_USER: AuthUser = {
  nome: "Usuário de Teste",
  login: TEST_USER_CREDENTIALS.login,
  email: "teste@empresa.com.br",
  perfil: "Administrador",
  grupoAD: "GG_COMEX_ADMIN",
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const loginWithLdap = React.useCallback(async (login: string, password: string) => {
    // Simulação de autenticação LDAP — a integração real ocorre no backend
    // que consulta o Active Directory e sincroniza o usuário e grupos.
    await new Promise((r) => setTimeout(r, 900))

    if (!login || !password) {
      return { ok: false, error: "Informe usuário e senha de rede." }
    }

    const isTestUser =
      login.trim().toLowerCase() === TEST_USER_CREDENTIALS.login &&
      password === TEST_USER_CREDENTIALS.password

    if (!isTestUser) {
      return { ok: false, error: "Credenciais inválidas no Active Directory. Use o usuário de teste disponibilizado." }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(TEST_USER))
    setUser(TEST_USER)
    return { ok: true }
  }, [])

  const logout = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    loginWithLdap,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider")
  return ctx
}

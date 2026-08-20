import { Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando sessão...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

interface PermissionRouteProps {
  children: React.ReactNode
  permission?: string
  permissions?: string[]
}

export function PermissionRoute({ children, permission, permissions }: PermissionRouteProps) {
  const { isAuthenticated, isLoading, hasAnyPermission } = useAuth()
  const required = permissions ?? (permission ? [permission] : [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando sessão...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (required.length > 0 && !hasAnyPermission(required)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

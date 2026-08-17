import { NavLink } from "react-router-dom"
import {
  LayoutDashboard, FileWarning, UserCog, GitCompareArrows, CheckCircle2,
  Users, ShieldCheck, Settings, Network, Database,
  ChevronLeft, ChevronRight, Ship,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { useMemo, useState } from "react"

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  badge?: number
  permissions?: string[]
}

interface NavSection {
  title: string
  items: NavItem[]
}

const sections: NavSection[] = [
  {
    title: "Operação",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, permissions: ["visualizar_bl"] },
      { to: "/bl-nao-encontrado", label: "BL Não Encontrado", icon: FileWarning, permissions: ["visualizar_bl"] },
      { to: "/apoio-humano", label: "Apoio Humano", icon: UserCog, permissions: ["visualizar_bl"] },
      { to: "/divergencia", label: "Divergências", icon: GitCompareArrows, permissions: ["visualizar_bl"] },
      { to: "/processo-finalizado", label: "Processos Finalizados", icon: CheckCircle2, permissions: ["visualizar_bl"] },
      { to: "/admin/bl-database", label: "BL Master / House", icon: Database, permissions: ["visualizar_bl"] },
    ],
  },
  {
    title: "Administração",
    items: [
      { to: "/admin/usuarios", label: "Usuários", icon: Users, permissions: ["administrar_usuarios"] },
      { to: "/admin/rbac", label: "Perfis & Permissões", icon: ShieldCheck, permissions: ["administrar_usuarios"] },
    ],
  },
  {
    title: "Integrações",
    items: [
      { to: "/admin/ldap", label: "LDAP / Active Directory", icon: Network, permissions: ["configurar_integracoes"] },
      { to: "/admin/banco-dados", label: "Banco de Dados", icon: Settings, permissions: ["configurar_integracoes"] },
    ],
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { hasAnyPermission } = useAuth()

  const visibleSections = useMemo(() => {
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          !item.permissions?.length || hasAnyPermission(item.permissions),
        ),
      }))
      .filter((section) => section.items.length > 0)
  }, [hasAnyPermission])

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col shrink-0 bg-primary text-white transition-all duration-300 h-screen sticky top-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className={cn(
        "flex items-center h-16 border-b border-white/10",
        collapsed ? "justify-center px-2" : "gap-2.5 px-4",
      )}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent shadow-soft">
          <Ship className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-sm tracking-wide">ComexBL</span>
            <span className="text-[10px] text-primary-200">GlobalSys Integration</span>
          </div>
        )}
      </div>

      <nav className={cn(
        "flex-1 overflow-y-auto scrollbar-thin py-4 space-y-6",
        collapsed ? "px-1.5" : "px-3",
      )}>
        {visibleSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-primary-300">
                {section.title}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center rounded-lg py-2 text-sm font-medium transition-colors relative",
                        collapsed ? "justify-center px-2 gap-0" : "gap-3 px-2.5",
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-primary-200 hover:bg-white/5 hover:text-white"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-accent" />
                        )}
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                        {!collapsed && item.badge ? (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                            {item.badge}
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-white/10", collapsed ? "p-2" : "p-3")}>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-primary-200 hover:bg-white/5 hover:text-white transition-colors text-sm"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /> Recolher</>}
        </button>
      </div>
    </aside>
  )
}

import { NavLink } from "react-router-dom"
import {
  LayoutDashboard, FileWarning, UserCog, GitCompareArrows, CheckCircle2,
  Users, ShieldCheck, ScrollText, Settings, Network, Cloud, Database,
  ChevronLeft, ChevronRight, Ship,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  badge?: number
}

interface NavSection {
  title: string
  items: NavItem[]
}

const sections: NavSection[] = [
  {
    title: "Operação",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/bl-nao-encontrado", label: "BL Não Encontrado", icon: FileWarning, badge: 3 },
      { to: "/apoio-humano", label: "Apoio Humano", icon: UserCog, badge: 5 },
      { to: "/divergencia", label: "Divergências", icon: GitCompareArrows, badge: 7 },
      { to: "/processo-finalizado", label: "Processos Finalizados", icon: CheckCircle2 },
    ],
  },
  {
    title: "Administração",
    items: [
      { to: "/admin/usuarios", label: "Usuários", icon: Users },
      { to: "/admin/rbac", label: "Perfis & Permissões", icon: ShieldCheck },
      { to: "/admin/auditoria", label: "Auditoria", icon: ScrollText },
      { to: "/admin/bl-database", label: "BL Master / House", icon: Database },
    ],
  },
  {
    title: "Integrações",
    items: [
      { to: "/admin/ldap", label: "LDAP / Active Directory", icon: Network },
      { to: "/admin/onedrive", label: "OneDrive", icon: Cloud },
      { to: "/admin/banco-dados", label: "Banco de Dados", icon: Settings },
    ],
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col shrink-0 bg-primary text-white transition-all duration-300 h-screen sticky top-0",
        collapsed ? "w-[76px]" : "w-64"
      )}
    >
      <div className="flex items-center gap-2.5 h-16 px-4 border-b border-white/10">
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

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-6">
        {sections.map((section) => (
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
                        "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors relative",
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

      <div className="p-3 border-t border-white/10">
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

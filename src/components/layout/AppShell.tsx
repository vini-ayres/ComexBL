import { Outlet, useLocation } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { AnimatePresence, motion } from "framer-motion"

const titles: Record<string, string> = {
  "/": "Dashboard Operacional",
  "/bl-nao-encontrado": "BL Não Encontrado no GlobalSys",
  "/apoio-humano": "Apoio Humano",
  "/divergencia": "Divergência BL Final x GlobalSys",
  "/processo-finalizado": "Processo Finalizado",
  "/admin/usuarios": "Usuários",
  "/admin/rbac": "Perfis & Permissões",
  "/admin/auditoria": "Auditoria",
  "/admin/bl-database": "BL Master / House",
  "/admin/ldap": "LDAP / Active Directory",
  "/admin/onedrive": "Integração OneDrive",
  "/admin/banco-dados": "Banco de Dados",
}

export function AppShell() {
  const location = useLocation()
  const title = titles[location.pathname] || "ComexBL"

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} />
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

import { Bell, Search, Menu, LogOut, Settings, UserCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { useNavigate } from "react-router-dom"
import { initials } from "@/lib/utils"

export function Topbar({ onMenuClick, title }: { onMenuClick?: () => void; title?: string }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-white/90 backdrop-blur px-4 lg:px-6">
      <button className="lg:hidden text-primary-800" onClick={onMenuClick}>
        <Menu className="h-6 w-6" />
      </button>

      {title && <h1 className="hidden md:block text-lg font-bold text-primary-900">{title}</h1>}

      <div className="flex-1 flex justify-center max-w-xl mx-auto">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por BL, navio, container..." className="pl-9 bg-secondary/60 border-transparent focus-visible:bg-white" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative rounded-full p-2 text-primary-700 hover:bg-primary-50 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-white" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg pl-1 pr-2 py-1 hover:bg-primary-50 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback style={{ backgroundColor: "#EBEFF4" }}>{initials(user?.nome || "US")}</AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start leading-tight">
                <span className="text-sm font-semibold text-primary-900">{user?.nome}</span>
                <span className="text-[11px] text-muted-foreground">{user?.perfil}</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserCircle className="h-4 w-4" /> Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin/usuarios")}>
              <Settings className="h-4 w-4" /> Administração
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-danger-600 focus:text-danger-700 focus:bg-danger-50">
              <LogOut className="h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

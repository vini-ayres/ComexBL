import { useEffect, useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Search, RefreshCcw, ShieldCheck, Ban, CheckCircle2, Clock, Users as UsersIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { DataTable } from "@/components/shared/DataTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { KpiCard } from "@/components/shared/KpiCard"
import { ApiStatePanel } from "@/components/shared/ApiStatePanel"
import { fetchUsers, syncUsersFromAd, updateUserStatus } from "@/lib/api/users"
import { ApiError } from "@/lib/api/client"
import type { Usuario } from "@/types"
import { formatDateTime, initials, timeAgo } from "@/lib/utils"

const statusBadge: Record<Usuario["status"], { variant: "success" | "neutral" | "danger"; label: string }> = {
  ativo: { variant: "success", label: "Ativo" },
  inativo: { variant: "neutral", label: "Inativo" },
  bloqueado: { variant: "danger", label: "Bloqueado" },
}

export default function Usuarios() {
  const [search, setSearch] = useState("")
  const [perfilFilter, setPerfilFilter] = useState("todos")
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadUsers() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchUsers()
      setUsuarios(data.users)
      setLastSyncAt(data.lastSyncAt)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar usuários.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  async function handleSync() {
    setSyncing(true)
    toast.loading("Sincronizando usuários e grupos do AD...", { id: "users-sync" })
    try {
      const result = await syncUsersFromAd()
      await loadUsers()
      toast.success(
        `${result.totalActiveUsers} usuário(s) ativos sincronizados (${result.usersCreated} novos, ${result.usersUpdated} atualizados).`,
        { id: "users-sync" },
      )
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha na sincronização.", { id: "users-sync" })
    } finally {
      setSyncing(false)
    }
  }

  async function toggleBlock(user: Usuario) {
    const nextStatus = user.status === "bloqueado" ? "ativo" : "bloqueado"
    try {
      await updateUserStatus(user.id, nextStatus)
      setUsuarios((current) =>
        current.map((item) => (item.id === user.id ? { ...item, status: nextStatus } : item)),
      )
      toast.success(nextStatus === "bloqueado" ? "Usuário bloqueado." : "Usuário desbloqueado.")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao atualizar status.")
    }
  }

  const filtered = useMemo(() => {
    return usuarios.filter((u) => {
      const matchSearch = !search || u.nome.toLowerCase().includes(search.toLowerCase()) || u.login.toLowerCase().includes(search.toLowerCase())
      const matchPerfil = perfilFilter === "todos" || u.perfil === perfilFilter
      return matchSearch && matchPerfil
    })
  }, [search, perfilFilter, usuarios])

  const ativos = usuarios.filter((u) => u.status === "ativo").length
  const bloqueados = usuarios.filter((u) => u.status === "bloqueado").length

  const columns: ColumnDef<Usuario>[] = [
    {
      accessorKey: "nome",
      header: "Usuário",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback style={{ backgroundColor: `${row.original.avatarColor}1A`, color: row.original.avatarColor }}>
              {initials(row.original.nome)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-primary-900">{row.original.nome}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "grupoAD",
      header: "Grupo AD",
      cell: ({ row }) => <code className="text-xs bg-secondary px-2 py-1 rounded text-primary-700">{row.original.grupoAD}</code>,
    },
    {
      accessorKey: "perfil",
      header: "Perfil",
      cell: ({ row }) => <Badge variant="outline">{row.original.perfil}</Badge>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = statusBadge[row.original.status]
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    {
      accessorKey: "ultimoAcesso",
      header: "Último Acesso",
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.ultimoAcesso ? (
            <>
              <p className="text-primary-800">{formatDateTime(row.original.ultimoAcesso)}</p>
              <p className="text-xs text-muted-foreground">{timeAgo(row.original.ultimoAcesso)}</p>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.status === "bloqueado" ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-success-600"
              title="Desbloquear"
              onClick={() => void toggleBlock(row.original)}
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-danger-600"
              title="Bloquear"
              onClick={() => void toggleBlock(row.original)}
            >
              <Ban className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando usuários...
      </div>
    )
  }

  if (error) {
    return <ApiStatePanel variant="error" title="Usuários" description={error} onRetry={() => void loadUsers()} />
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total de Usuários" value={usuarios.length} icon={UsersIcon} tone="primary" index={0} />
        <KpiCard label="Usuários Ativos" value={ativos} icon={CheckCircle2} tone="success" index={1} />
        <KpiCard label="Bloqueados" value={bloqueados} icon={Ban} tone="danger" index={2} />
        <KpiCard
          label="Última Sincronização AD"
          value={lastSyncAt ? formatDateTime(lastSyncAt).split(" ")[1] ?? "—" : "—"}
          suffix={lastSyncAt ? formatDateTime(lastSyncAt).split(" ")[0] : undefined}
          icon={Clock}
          tone="info"
          index={3}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Usuários Sincronizados (Active Directory)</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Provisionamento automático via grupos GG_OCR_BL_* — sem cadastro manual</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void handleSync()} disabled={syncing}>
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
            Sincronizar agora
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou login..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={perfilFilter} onValueChange={setPerfilFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <ShieldCheck className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os perfis</SelectItem>
                <SelectItem value="Administrador">Administrador</SelectItem>
                <SelectItem value="Supervisor">Supervisor</SelectItem>
                <SelectItem value="Operador">Operador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DataTable columns={columns} data={filtered} pageSize={8} />
        </CardContent>
      </Card>
    </div>
  )
}

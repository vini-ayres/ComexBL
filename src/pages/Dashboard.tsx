import { useCallback, useEffect, useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import {
  Clock, AlertTriangle, UserCog, CheckCircle2, Timer, Search, Filter,
  Eye, MoreHorizontal, RefreshCcw, Ship, ArrowRight, Loader2, AlertCircle,
} from "lucide-react"
import { KpiCard } from "@/components/shared/KpiCard"
import { DataTable } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { fetchDashboard } from "@/lib/api/dashboard"
import type { DashboardBlListItemDto, DashboardKpiDto } from "@/lib/api/types"
import type { BLStatus } from "@/types"
import { ApiError } from "@/lib/api/client"
import { formatDateTime, initials } from "@/lib/utils"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

const kpiIcons = [Clock, AlertTriangle, UserCog, CheckCircle2, Timer] as const
const kpiTones = ["info", "danger", "warning", "success", "primary"] as const

const statusRouteMap: Record<BLStatus, string> = {
  nao_encontrado: "/bl-nao-encontrado",
  apoio_humano: "/apoio-humano",
  divergencia: "/divergencia",
  finalizado: "/processo-finalizado",
  processando: "/",
}

export default function Dashboard() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [tipoFilter, setTipoFilter] = useState<string>("todos")
  const [kpis, setKpis] = useState<DashboardKpiDto[]>([])
  const [blList, setBlList] = useState<DashboardBlListItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(timer)
  }, [search])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetchDashboard({
        page: 1,
        pageSize: 100,
        status: statusFilter !== "todos" ? statusFilter : undefined,
        tipo: tipoFilter !== "todos" ? tipoFilter : undefined,
        search: debouncedSearch || undefined,
      })

      setKpis(result.kpis)
      setBlList(result.items.data)
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : "Não foi possível carregar o dashboard. Verifique se a API está rodando."
      setError(message)
      setKpis([])
      setBlList([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, tipoFilter])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  function handleRefresh() {
    void loadDashboard()
    toast.success("Dashboard atualizado.")
  }

  const columns: ColumnDef<DashboardBlListItemDto>[] = useMemo(() => [
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "numeroBl",
      header: "Número BL",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-primary-900">{row.original.numeroBl}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Ship className="h-3 w-3" /> {row.original.navio ?? "-"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "tipo",
      header: "Tipo",
      cell: ({ row }) => (
        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-primary-700">
          {row.original.tipo}
        </span>
      ),
    },
    {
      accessorKey: "pendencia",
      header: "Pendência",
      cell: ({ row }) => <span className="text-sm text-foreground">{row.original.pendencia}</span>,
    },
    {
      accessorKey: "responsavel",
      header: "Responsável",
      cell: ({ row }) =>
        row.original.responsavel ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]">{initials(row.original.responsavel)}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{row.original.responsavel}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">Não atribuído</span>
        ),
    },
    {
      accessorKey: "dataHora",
      header: "Data/Hora",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatDateTime(row.original.dataHora)}
        </span>
      ),
    },
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate(statusRouteMap[row.original.status])}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(statusRouteMap[row.original.status])}>
                <ArrowRight className="h-4 w-4" /> Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <RefreshCcw className="h-4 w-4" /> Reprocessar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [navigate])

  if (loading && kpis.length === 0 && blList.length === 0 && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Carregando dashboard operacional...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-danger-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-danger-700">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void loadDashboard()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((kpi, i) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            delta={kpi.delta}
            suffix={kpi.suffix}
            icon={kpiIcons[i] ?? Clock}
            tone={kpiTones[i] ?? "primary"}
            index={i}
          />
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>BLs em Acompanhamento</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Monitoramento operacional via BL_Workflow, BL_Master e BL_House
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5" />
            )}
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar BL, navio ou responsável..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="divergencia">Divergência</SelectItem>
                <SelectItem value="apoio_humano">Apoio Humano</SelectItem>
                <SelectItem value="processando">Processando</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
                <SelectItem value="nao_encontrado">Não Encontrado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="Master">Master</SelectItem>
                <SelectItem value="House">House</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading && blList.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <DataTable columns={columns} data={blList} pageSize={8} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

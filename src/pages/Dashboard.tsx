import { useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import {
  Clock, AlertTriangle, UserCog, CheckCircle2, Timer, Search, Filter,
  Eye, MoreHorizontal, RefreshCcw, Ship, ArrowRight,
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
import { blList, kpis } from "@/data/mockData"
import type { BLListItem, BLStatus } from "@/types"
import { formatDateTime, initials } from "@/lib/utils"
import { useNavigate } from "react-router-dom"

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
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [tipoFilter, setTipoFilter] = useState<string>("todos")
  const navigate = useNavigate()

  const filteredData = useMemo(() => {
    return blList.filter((item) => {
      const matchesSearch =
        !search ||
        item.numeroBL.toLowerCase().includes(search.toLowerCase()) ||
        item.navio?.toLowerCase().includes(search.toLowerCase()) ||
        item.responsavel?.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "todos" || item.status === statusFilter
      const matchesTipo = tipoFilter === "todos" || item.tipo === tipoFilter
      return matchesSearch && matchesStatus && matchesTipo
    })
  }, [search, statusFilter, tipoFilter])

  const columns: ColumnDef<BLListItem>[] = [
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "numeroBL",
      header: "Número BL",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-primary-900">{row.original.numeroBL}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Ship className="h-3 w-3" /> {row.original.navio}
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
      cell: ({ row }) => <span className="text-sm text-muted-foreground tabular-nums">{formatDateTime(row.original.dataHora)}</span>,
    },
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(statusRouteMap[row.original.status])}>
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
              <DropdownMenuItem>
                <RefreshCcw className="h-4 w-4" /> Reprocessar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((kpi, i) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            delta={kpi.delta}
            suffix={kpi.suffix}
            icon={kpiIcons[i]}
            tone={kpiTones[i]}
            index={i}
          />
        ))}
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>BLs em Acompanhamento</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Monitoramento em tempo real dos BLs processados via OCR/n8n</p>
          </div>
          <Button variant="outline" size="sm">
            <RefreshCcw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filters */}
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

          <DataTable columns={columns} data={filteredData} pageSize={8} />
        </CardContent>
      </Card>
    </div>
  )
}

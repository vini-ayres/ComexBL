import { useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Search, ScrollText, Eye, Download } from "lucide-react"
import { DataTable } from "@/components/shared/DataTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { registrosAuditoria } from "@/data/mockData"
import type { RegistroAuditoria } from "@/types"
import { formatDateTime } from "@/lib/utils"

export default function Auditoria() {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<RegistroAuditoria | null>(null)

  const filtered = useMemo(() => {
    return registrosAuditoria.filter((r) =>
      !search ||
      r.usuario.toLowerCase().includes(search.toLowerCase()) ||
      r.registro.toLowerCase().includes(search.toLowerCase()) ||
      r.acao.toLowerCase().includes(search.toLowerCase())
    )
  }, [search])

  const columns: ColumnDef<RegistroAuditoria>[] = [
    {
      accessorKey: "dataHora",
      header: "Data/Hora",
      cell: ({ row }) => <span className="text-sm tabular-nums text-muted-foreground">{formatDateTime(row.original.dataHora)}</span>,
    },
    {
      accessorKey: "usuario",
      header: "Usuário",
      cell: ({ row }) => <span className="font-medium text-primary-900">{row.original.usuario}</span>,
    },
    {
      accessorKey: "acao",
      header: "Ação",
      cell: ({ row }) => <span className="text-sm">{row.original.acao}</span>,
    },
    {
      accessorKey: "entidade",
      header: "Entidade",
      cell: ({ row }) => <Badge variant="outline">{row.original.entidade}</Badge>,
    },
    {
      accessorKey: "registro",
      header: "Registro",
      cell: ({ row }) => <code className="text-xs bg-secondary px-2 py-1 rounded">{row.original.registro}</code>,
    },
    {
      accessorKey: "ip",
      header: "IP Origem",
      cell: ({ row }) => <span className="text-xs text-muted-foreground font-mono">{row.original.ip}</span>,
    },
    {
      id: "acoes",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(row.original)}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2"><ScrollText className="h-4 w-4" /> Trilha de Auditoria</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Registro completo de ações realizadas no sistema, com valores antes/depois</p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar usuário, ação ou registro..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <DataTable columns={columns} data={filtered} pageSize={10} />
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Registro</DialogTitle>
            <DialogDescription>Auditoria completa da ação realizada</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Usuário" value={selected.usuario} />
                <Field label="Data/Hora" value={formatDateTime(selected.dataHora)} />
                <Field label="Ação" value={selected.acao} />
                <Field label="Entidade" value={selected.entidade} />
                <Field label="Registro" value={selected.registro} />
                <Field label="IP" value={selected.ip || "-"} />
              </div>

              {selected.valoresAntes && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div>
                    <p className="text-xs font-semibold text-danger-600 mb-2">Valores Antes</p>
                    {Object.entries(selected.valoresAntes).map(([k, v]) => (
                      <p key={k} className="text-xs"><span className="text-muted-foreground">{k}:</span> {v}</p>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-success-600 mb-2">Valores Depois</p>
                    {selected.valoresDepois && Object.entries(selected.valoresDepois).map(([k, v]) => (
                      <p key={k} className="text-xs"><span className="text-muted-foreground">{k}:</span> {v}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-primary-900">{value}</p>
    </div>
  )
}

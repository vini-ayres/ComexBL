import { useState } from "react"
import { CheckCircle2, Loader2, Pencil, Scale } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ConferenciaCampoDto, ConferenciaResolutionStrategy } from "@/lib/api/types"
import { cn } from "@/lib/utils"

interface ConferenciaFieldTablesProps {
  campos: ConferenciaCampoDto[]
  onResolveField: (
    campoKey: string,
    strategy: ConferenciaResolutionStrategy,
    manualValue?: string,
  ) => void
  resolvingKey: string | null
}

const CATEGORIA_ORDER = ["peso", "volume", "embalagem"] as const

const CATEGORIA_LABEL: Record<string, string> = {
  peso: "Peso",
  volume: "Volume",
  embalagem: "Embalagem",
}

function statusBadge(status: string) {
  if (status === "pendente") {
    return <Badge variant="warning">Pendente</Badge>
  }

  if (status === "resolvido_house") {
    return <Badge variant="success">House</Badge>
  }

  if (status === "resolvido_master") {
    return <Badge variant="info">Master</Badge>
  }

  if (status === "resolvido_manual") {
    return <Badge variant="neutral">Manual</Badge>
  }

  return <Badge variant="neutral">{status}</Badge>
}

export function ConferenciaFieldTables({
  campos,
  onResolveField,
  resolvingKey,
}: ConferenciaFieldTablesProps) {
  const [editingCampo, setEditingCampo] = useState<ConferenciaCampoDto | null>(null)
  const [manualValue, setManualValue] = useState("")

  const grouped = CATEGORIA_ORDER.map((categoria) => ({
    categoria,
    label: CATEGORIA_LABEL[categoria],
    rows: campos.filter((campo) => campo.categoria === categoria),
  })).filter((group) => group.rows.length > 0)

  if (campos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Nenhuma diferença de quantidade, peso bruto ou volume entre House e Master.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {grouped.map((group) => (
        <div key={group.categoria} className="space-y-2">
          <h4 className="text-sm font-semibold text-primary-900">{group.label}</h4>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-primary-50/60 border-b border-border">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700">Campo</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700">House</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700">Master</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700 w-28">Status</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-primary-700 w-56">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {group.rows.map((row) => {
                  const pending = row.status === "pendente"
                  const isResolving = resolvingKey === row.campoKey

                  return (
                    <tr
                      key={row.campoKey}
                      className={cn("hover:bg-primary-50/30", pending && "bg-warning-50/40")}
                    >
                      <td className="px-3 py-2.5 font-medium text-primary-900">{row.campoLabel}</td>
                      <td className="px-3 py-2.5 text-primary-800 tabular-nums">{row.valorHouse || "—"}</td>
                      <td className="px-3 py-2.5 text-primary-800 tabular-nums">{row.valorMaster || "—"}</td>
                      <td className="px-3 py-2.5">{statusBadge(row.status)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="xs"
                            disabled={!pending || isResolving}
                            onClick={() => onResolveField(row.campoKey, "aceitar_house")}
                          >
                            {isResolving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 text-success-600" />
                            )}
                            House
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            disabled={!pending || isResolving}
                            onClick={() => onResolveField(row.campoKey, "aceitar_master")}
                          >
                            {isResolving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Scale className="h-3.5 w-3.5 text-info-600" />
                            )}
                            Master
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            disabled={!pending || isResolving}
                            onClick={() => {
                              setEditingCampo(row)
                              setManualValue(row.valorManual ?? (row.valorHouse || row.valorMaster))
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <Dialog open={editingCampo != null} onOpenChange={(open) => !open && setEditingCampo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correção manual</DialogTitle>
            <DialogDescription>
              Informe o valor correto para {editingCampo?.campoLabel}. Ele será gravado no documento em conferência.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">House</p>
                <p className="font-medium tabular-nums">{editingCampo?.valorHouse || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Master</p>
                <p className="font-medium tabular-nums">{editingCampo?.valorMaster || "—"}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valor-manual">Valor corrigido</Label>
              <Input
                id="valor-manual"
                value={manualValue}
                onChange={(event) => setManualValue(event.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCampo(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!manualValue.trim() || !editingCampo}
              onClick={() => {
                if (!editingCampo) return
                onResolveField(editingCampo.campoKey, "manual", manualValue.trim())
                setEditingCampo(null)
              }}
            >
              Salvar correção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

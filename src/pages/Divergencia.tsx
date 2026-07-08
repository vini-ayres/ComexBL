import { useState } from "react"
import {
  CheckCircle2, XCircle, Pencil, Send, GitCompareArrows,
  History, Ship, Package, AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { divergenciaMaster, divergenciaHouse, historicoDivergencia } from "@/data/mockData"
import type { CampoDivergencia } from "@/types"
import { cn, formatDateTime } from "@/lib/utils"
import { toast } from "sonner"

function DivergenceTable({ data }: { data: CampoDivergencia[] }) {
  const divergentCount = data.filter((d) => d.status === "divergente").length
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-primary-50/60 border-b border-border">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700">Campo</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700">BL Final</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700">GlobalSys</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700 w-32">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((d) => (
            <tr key={d.id} className={cn(d.status === "divergente" && "bg-danger-50/40")}>
              <td className="px-4 py-3 font-medium text-primary-900">{d.campo}</td>
              <td className={cn("px-4 py-3", d.status === "divergente" && "font-semibold text-danger-700")}>{d.valorBLFinal}</td>
              <td className={cn("px-4 py-3", d.status === "divergente" && "font-semibold text-danger-700")}>{d.valorGlobalSys}</td>
              <td className="px-4 py-3">
                {d.status === "divergente" ? (
                  <Badge variant="danger"><AlertTriangle className="h-3 w-3" /> Divergente</Badge>
                ) : (
                  <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> Igual</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {divergentCount > 0 && (
        <div className="bg-danger-50 px-4 py-2 text-xs text-danger-700 font-medium border-t border-danger-100">
          {divergentCount} campo(s) divergente(s) nesta seção
        </div>
      )}
    </div>
  )
}

export default function Divergencia() {
  const [resolved, setResolved] = useState(false)

  function handleAction(action: string) {
    setResolved(true)
    const msgs: Record<string, string> = {
      aceitar: "BL aceito com os valores extraídos.",
      manter: "Valores do GlobalSys mantidos como referência.",
      encaminhar: "Divergência encaminhada para supervisão.",
    }
    toast.success(msgs[action] || "Ação registrada.")
  }

  const totalDivergentes =
    divergenciaMaster.filter((d) => d.status === "divergente").length +
    divergenciaHouse.filter((d) => d.status === "divergente").length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger-50 text-danger-600">
            <GitCompareArrows className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary-900">MBL-2026042 · MSC ISABELLA</h2>
            <p className="text-xs text-muted-foreground">
              Comparação BL Final x GlobalSys — {totalDivergentes} divergência(s) identificada(s) · Responsável: Carlos Mendes
            </p>
          </div>
        </div>
        <Badge variant="danger" className="text-sm px-3 py-1">Divergência</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comparação de Campos</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="master">
            <TabsList>
              <TabsTrigger value="master"><Ship className="h-3.5 w-3.5 mr-1" /> Master</TabsTrigger>
              <TabsTrigger value="house"><Package className="h-3.5 w-3.5 mr-1" /> Houses</TabsTrigger>
              <TabsTrigger value="historico"><History className="h-3.5 w-3.5 mr-1" /> Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="master">
              <DivergenceTable data={divergenciaMaster} />
            </TabsContent>

            <TabsContent value="house">
              <DivergenceTable data={divergenciaHouse} />
            </TabsContent>

            <TabsContent value="historico">
              <div className="space-y-3">
                {historicoDivergencia.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                      <History className="h-4 w-4" />
                    </div>
                    <div className="flex-1 text-sm">
                      <p>
                        <span className="font-semibold text-primary-900">{h.usuario}</span> corrigiu{" "}
                        <span className="font-medium">{h.campo}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="line-through">{h.valorAntes}</span> → <span className="text-primary-800 font-medium">{h.valorDepois}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">{formatDateTime(h.dataHora)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
            <Button variant="success" onClick={() => handleAction("aceitar")} disabled={resolved}>
              <CheckCircle2 className="h-4 w-4" /> Aceitar BL
            </Button>
            <Button variant="outline" onClick={() => handleAction("manter")} disabled={resolved}>
              <XCircle className="h-4 w-4" /> Manter GlobalSys
            </Button>
            <Button variant="secondary" disabled={resolved}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
            <Button variant="accent" onClick={() => handleAction("encaminhar")} disabled={resolved}>
              <Send className="h-4 w-4" /> Encaminhar
            </Button>
            {resolved && (
              <span className="ml-2 text-sm text-success-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Ação registrada com sucesso
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

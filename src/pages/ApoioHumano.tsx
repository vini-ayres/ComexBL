import { useState } from "react"
import {
  Check, Pencil, History, Save, CheckCircle2, AlertCircle,
  UserCog, X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { DocumentViewer } from "@/components/shared/DocumentViewer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { campoExtraidoMock, historicoApoioHumano } from "@/data/mockData"
import type { CampoExtraido } from "@/types"
import { formatDateTime, cn } from "@/lib/utils"
import { toast } from "sonner"

function confiancaColor(c: number) {
  if (c >= 80) return "text-success-600 bg-success-50"
  if (c >= 60) return "text-warning-600 bg-warning-50"
  return "text-danger-600 bg-danger-50"
}

export default function ApoioHumano() {
  const [campos, setCampos] = useState<CampoExtraido[]>(campoExtraidoMock)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState("")

  const pendentesCount = campos.filter((c) => c.status === "pendente").length

  function startEdit(campo: CampoExtraido) {
    setEditingId(campo.id)
    setDraftValue(campo.valorManual ?? campo.valorRecebido)
  }

  function saveEdit(id: string) {
    setCampos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, valorManual: draftValue, status: "editado" } : c))
    )
    setEditingId(null)
    toast.success("Campo atualizado com sucesso.")
  }

  function confirmField(id: string) {
    setCampos((prev) => prev.map((c) => (c.id === id ? { ...c, status: "confirmado" } : c)))
  }

  function handleConfirmAll() {
    setCampos((prev) => prev.map((c) => (c.status === "pendente" ? { ...c, status: "confirmado" } : c)))
    toast.success("Todos os campos pendentes foram confirmados.")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-50 text-warning-600">
            <UserCog className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary-900">MBL-2026042 · MSC ISABELLA</h2>
            <p className="text-xs text-muted-foreground">Correção manual necessária — {pendentesCount} campo(s) com baixa confiança</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning">Apoio Humano</Badge>
          <Button variant="outline" size="sm" onClick={handleConfirmAll}>
            <Check className="h-4 w-4" /> Confirmar pendentes
          </Button>
          <Button size="sm">
            <Save className="h-4 w-4" /> Salvar correções
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: document */}
        <DocumentViewer nome="MBL-2026042_original.pdf" paginas={3} origemPath="/BLs/2026/07" className="xl:sticky xl:top-20 h-fit" />

        {/* Right: fields table */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Campos Extraídos</CardTitle>
            <span className="text-xs text-muted-foreground">Usuário: Fernanda Lima</span>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="campos">
              <TabsList>
                <TabsTrigger value="campos">Campos</TabsTrigger>
                <TabsTrigger value="historico">Histórico de Alterações</TabsTrigger>
              </TabsList>

              <TabsContent value="campos">
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-primary-50/60 border-b border-border">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700">Campo</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700">Valor</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700 w-28">Confiança</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700 w-24">Status</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-primary-700 w-20">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {campos.map((campo) => (
                        <tr key={campo.id} className={cn("hover:bg-primary-50/30", campo.status === "pendente" && "bg-warning-50/40")}>
                          <td className="px-3 py-2.5 font-medium text-primary-900 whitespace-nowrap">{campo.campo}</td>
                          <td className="px-3 py-2.5">
                            {editingId === campo.id ? (
                              <Input
                                value={draftValue}
                                onChange={(e) => setDraftValue(e.target.value)}
                                className="h-8 text-sm"
                                autoFocus
                              />
                            ) : (
                              <div className="flex flex-col">
                                <span className={cn(campo.status === "editado" && "line-through text-muted-foreground text-xs")}>
                                  {campo.valorRecebido}
                                </span>
                                {campo.valorManual && (
                                  <span className="text-primary-900 font-medium">{campo.valorManual}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded", confiancaColor(campo.confianca))}>
                                {campo.confianca}%
                              </span>
                            </div>
                            <Progress value={campo.confianca} className="h-1 mt-1 w-16" />
                          </td>
                          <td className="px-3 py-2.5">
                            {campo.status === "confirmado" && <Badge variant="success" className="text-[10px]"><CheckCircle2 className="h-3 w-3" />OK</Badge>}
                            {campo.status === "editado" && <Badge variant="info" className="text-[10px]"><Pencil className="h-3 w-3" />Editado</Badge>}
                            {campo.status === "pendente" && <Badge variant="warning" className="text-[10px]"><AlertCircle className="h-3 w-3" />Pendente</Badge>}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              {editingId === campo.id ? (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-success-600" onClick={() => saveEdit(campo.id)}>
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingId(null)}>
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(campo)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  {campo.status === "pendente" && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-success-600" onClick={() => confirmField(campo.id)}>
                                      <Check className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="historico">
                <div className="space-y-3">
                  {historicoApoioHumano.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                        <History className="h-4 w-4" />
                      </div>
                      <div className="flex-1 text-sm">
                        <p>
                          <span className="font-semibold text-primary-900">{h.usuario}</span>{" "}
                          alterou <span className="font-medium">{h.campo}</span>
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

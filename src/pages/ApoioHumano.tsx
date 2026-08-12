import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Check, Pencil, History, Save, CheckCircle2, AlertCircle,
  UserCog, X, ChevronLeft, ChevronRight, Loader2, Boxes, Hash,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { DocumentViewer } from "@/components/shared/DocumentViewer"
import { OperationalEmptyQueueCard } from "@/components/shared/OperationalEmptyQueueCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchApoioHumano, saveApoioHumanoCampos } from "@/lib/api/apoio-humano"
import type { ApoioHumanoDetailDto, CampoExtraidoDto, HistoricoAlteracaoDto } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import { formatDateTime, cn } from "@/lib/utils"
import { groupCargoCampos, resolveCargoFieldLabel } from "@/lib/apoio-humano/cargo-display"
import { toast } from "sonner"

function confiancaColor(c: number) {
  if (c >= 80) return "text-success-600 bg-success-50"
  if (c >= 60) return "text-warning-600 bg-warning-50"
  return "text-danger-600 bg-danger-50"
}

type CampoCategoria = "scalar" | "cargo" | "ncm"

function resolveCampoCategoria(campoId: string): CampoCategoria {
  if (campoId.startsWith("cargo.")) return "cargo"
  if (campoId.startsWith("ncm.")) return "ncm"
  return "scalar"
}

function filterCamposPorCategoria(campos: CampoExtraidoDto[], categoria: CampoCategoria) {
  return campos.filter((campo) => resolveCampoCategoria(campo.id) === categoria)
}

interface CamposTableProps {
  campos: CampoExtraidoDto[]
  editingId: string | null
  draftValue: string
  onDraftChange: (value: string) => void
  onStartEdit: (campo: CampoExtraidoDto) => void
  onSaveEdit: (id: string) => void
  onCancelEdit: () => void
  onConfirmField: (id: string) => void
  emptyMessage?: string
}

function CamposTable({
  campos,
  editingId,
  draftValue,
  onDraftChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onConfirmField,
  emptyMessage = "Nenhum campo nesta seção.",
}: CamposTableProps) {
  if (campos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">{emptyMessage}</p>
    )
  }

  return (
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
                    onChange={(e) => onDraftChange(e.target.value)}
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
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-success-600" onClick={() => onSaveEdit(campo.id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onCancelEdit}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onStartEdit(campo)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {campo.status === "pendente" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-success-600" onClick={() => onConfirmField(campo.id)}>
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
  )
}

function CargoCamposTable({
  campos,
  editingId,
  draftValue,
  onDraftChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onConfirmField,
  emptyMessage = "Nenhum cargo vinculado a este House.",
}: CamposTableProps) {
  const groups = useMemo(() => groupCargoCampos(campos), [campos])

  if (campos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">{emptyMessage}</p>
    )
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.key} className="space-y-2">
          <h4 className="text-sm font-semibold text-primary-900">{group.label}</h4>
          <CamposTable
            campos={group.campos.map((campo) => ({
              ...campo,
              campo: resolveCargoFieldLabel(campo),
            }))}
            editingId={editingId}
            draftValue={draftValue}
            onDraftChange={onDraftChange}
            onStartEdit={onStartEdit}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onConfirmField={onConfirmField}
          />
        </div>
      ))}
    </div>
  )
}

export default function ApoioHumano() {
  const [data, setData] = useState<ApoioHumanoDetailDto | null>(null)
  const [campos, setCampos] = useState<CampoExtraidoDto[]>([])
  const [historico, setHistorico] = useState<HistoricoAlteracaoDto[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState("")
  const [saving, setSaving] = useState(false)

  const loadBl = useCallback(async (targetPage: number) => {
    setLoading(true)
    setError(null)
    setEditingId(null)

    try {
      const result = await fetchApoioHumano(targetPage)
      setData(result)
      setCampos(result.campos)
      setHistorico(result.historico)
      setPage(result.pagination.page)
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : "Não foi possível carregar o BL. Verifique se a API está rodando."
      setError(message)
      setData(null)
      setCampos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBl(page)
  }, [page, loadBl])

  const pendentesCount = campos.filter((c) => c.status === "pendente").length
  const totalPages = data?.pagination.totalPages ?? 1
  const totalItems = data?.pagination.total ?? 0
  const isHouseDocument = data?.item.tipo === "House"

  const scalarCampos = useMemo(
    () => filterCamposPorCategoria(campos, "scalar"),
    [campos],
  )
  const cargoCampos = useMemo(
    () => filterCamposPorCategoria(campos, "cargo"),
    [campos],
  )
  const ncmCampos = useMemo(
    () => filterCamposPorCategoria(campos, "ncm"),
    [campos],
  )

  const camposTableProps = {
    editingId,
    draftValue,
    onDraftChange: setDraftValue,
    onStartEdit: startEdit,
    onSaveEdit: saveEdit,
    onCancelEdit: () => setEditingId(null),
    onConfirmField: confirmField,
  }

  function startEdit(campo: CampoExtraidoDto) {
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

  async function handleSaveCorrecoes() {
    if (!data) return

    setSaving(true)

    try {
      const result = await saveApoioHumanoCampos(data.item.tipo, data.item.id, {
        campos: campos.map((campo) => ({
          campoKey: campo.id,
          campoLabel: campo.campo,
          valorRecebido: campo.valorRecebido,
          valorManual: campo.valorManual,
          confianca: campo.confianca,
          status: campo.status,
        })),
      })

      if (result.historico.length > 0) {
        setHistorico((prev) => [...result.historico, ...prev])
      }

      if (result.completed) {
        toast.success("Revisão concluída. Carregando próximo BL da fila...")
        await loadBl(1)
        return
      }

      toast.success(
        result.saved > 0
          ? `${result.saved} alteração(ões) salva(s) com sucesso.`
          : "Estado atual salvo com sucesso.",
      )

      await loadBl(page)
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : "Não foi possível salvar as correções."
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  function goToPrevious() {
    if (page > 1) setPage((p) => p - 1)
  }

  function goToNext() {
    if (page < totalPages) setPage((p) => p + 1)
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Carregando BL do banco de dados...</p>
      </div>
    )
  }

  if (error && !data) {
    const isEmptyQueue = error.includes("Nenhum BL pendente")
    if (isEmptyQueue) {
      return (
        <OperationalEmptyQueueCard
          title="Nenhum BL pendente de apoio humano"
          description="Todos os documentos foram validados ou não possuem campos pendentes."
        />
      )
    }

    return (
      <div className="rounded-xl border border-border bg-white px-4 py-12 text-center">
        <AlertCircle className="h-8 w-8 text-danger-600 mx-auto mb-3" />
        <p className="text-sm text-danger-700">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => void loadBl(page)}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (!data) return null

  const tituloNavio = data.item.tipo === "Master"
    ? `${data.item.numeroBl} · ${data.item.navio}`
    : `${data.item.numeroBl} · House`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-50 text-warning-600">
            <UserCog className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary-900">{tituloNavio}</h2>
            <p className="text-xs text-muted-foreground">
              {data.item.tipo} · Correção manual — {pendentesCount} campo(s) com baixa confiança
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="warning">Apoio Humano</Badge>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-white px-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page <= 1 || loading} onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium text-primary-800 px-2 min-w-[80px] text-center">
              {loading ? "..." : `${page} / ${totalPages}`}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= totalPages || loading} onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">{totalItems} BL(s) na fila</span>
          <Button variant="outline" size="sm" onClick={handleConfirmAll}>
            <Check className="h-4 w-4" /> Confirmar pendentes
          </Button>
          <Button size="sm" onClick={() => void handleSaveCorrecoes()} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar correções
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DocumentViewer
          nome={data.documento.nome}
          paginas={data.documento.paginas}
          origemPath={data.documento.origemPath}
          className="xl:sticky xl:top-20 h-fit"
        />

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Campos Extraídos</CardTitle>
            <span className="text-xs text-muted-foreground">
              BL {page} de {totalPages}
            </span>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            {!loading && (
              <Tabs defaultValue="campos">
                <TabsList>
                  <TabsTrigger value="campos">Campos</TabsTrigger>
                  <TabsTrigger value="historico">Histórico de Alterações</TabsTrigger>
                </TabsList>

                <TabsContent value="campos">
                  {isHouseDocument ? (
                    <Tabs defaultValue="scalar">
                      <TabsList>
                        <TabsTrigger value="scalar">Campos ({scalarCampos.length})</TabsTrigger>
                        <TabsTrigger value="cargo">
                          <Boxes className="h-3.5 w-3.5 mr-1" /> Cargo ({cargoCampos.length})
                        </TabsTrigger>
                        <TabsTrigger value="ncm">
                          <Hash className="h-3.5 w-3.5 mr-1" /> NCM ({ncmCampos.length})
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="scalar">
                        <CamposTable
                          campos={scalarCampos}
                          {...camposTableProps}
                          emptyMessage="Nenhum campo escalar para validar."
                        />
                      </TabsContent>
                      <TabsContent value="cargo">
                        <CargoCamposTable
                          campos={cargoCampos}
                          {...camposTableProps}
                        />
                      </TabsContent>
                      <TabsContent value="ncm">
                        <CamposTable
                          campos={ncmCampos}
                          {...camposTableProps}
                          emptyMessage="Nenhum NCM vinculado a este House."
                        />
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <CamposTable
                      campos={campos}
                      {...camposTableProps}
                      emptyMessage="Nenhum campo para validar."
                    />
                  )}
                </TabsContent>

                <TabsContent value="historico">
                  <div className="space-y-3">
                    {historico.length === 0 && (
                      <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma alteração registrada para este BL.</p>
                    )}
                    {historico.map((h) => (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

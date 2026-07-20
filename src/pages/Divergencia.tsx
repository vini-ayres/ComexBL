import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CheckCircle2, XCircle, Pencil, Send, GitCompareArrows,
  History, Ship, Package, AlertTriangle, Boxes, Hash,
  Loader2, RefreshCcw, Clock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApiError } from "@/lib/api/client"
import {
  compareAndPersistDivergenciaGlobalSys,
  compareDivergenciaGlobalSys,
  fetchDivergenciaLatest,
  resolveDivergencia,
  resolveDivergenciaCampo,
} from "@/lib/api/divergencia"
import { fetchProcessoTimeline } from "@/lib/api/processo"
import { fetchWorkflow } from "@/lib/api/workflow"
import type {
  DivergenciaCampoDto,
  DivergenciaCampoResolutionDetailDto,
  DivergenciaLatestDetailDto,
  DivergenciaResolutionStrategy,
  ProcessoTimelineResponseDto,
  WorkflowSummaryDto,
} from "@/lib/api/types"
import { BlFinalView } from "@/components/bl-final/BlFinalView"
import { ProcessoTimeline } from "@/components/processo/ProcessoTimeline"
import { WorkflowSummaryCard } from "@/components/workflow/WorkflowSummaryCard"
import { ApiStatePanel } from "@/components/shared/ApiStatePanel"
import { TableSkeleton } from "@/components/shared/LoadingSkeleton"
import { useDocumentParams } from "@/hooks/useDocumentParams"
import { useAuth } from "@/hooks/useAuth"
import { fetchBlFinal } from "@/lib/api/bl-final"
import type { BlFinalResponseDto } from "@/lib/api/types"
import { cn, formatDateTime } from "@/lib/utils"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

interface DisplayRow {
  key: string
  label: string
  valorBlFinal: string
  valorGlobalSys: string
  status: string
  categoria: string
  pending: boolean
}

function isPendingCampoStatus(status: string): boolean {
  return status === "pendente"
}

function campoStatusBadge(status: string) {
  if (isPendingCampoStatus(status)) {
    return (
      <Badge variant="danger">
        <AlertTriangle className="h-3 w-3" /> Pendente
      </Badge>
    )
  }

  if (status.startsWith("resolvido")) {
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3 w-3" /> Resolvido
      </Badge>
    )
  }

  return (
    <Badge variant="success">
      <CheckCircle2 className="h-3 w-3" /> Igual
    </Badge>
  )
}

function comparisonStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    completo_sem_divergencia: "Completo sem divergência",
    completo_com_divergencia: "Completo com divergência",
    documento_incompleto: "Documento incompleto",
    erro_comparacao: "Erro na comparação",
  }
  return labels[status] ?? status
}

function mapCamposToRows(campos: DivergenciaCampoDto[]): DisplayRow[] {
  return campos.map((campo) => ({
    key: campo.campoKey,
    label: campo.campoLabel,
    valorBlFinal: campo.valorBlFinal,
    valorGlobalSys: campo.valorGlobalSys,
    status: campo.status,
    categoria: campo.categoria,
    pending: isPendingCampoStatus(campo.status),
  }))
}

function DivergenceTable({
  data,
  onResolveField,
  resolvingKey,
}: {
  data: DisplayRow[]
  onResolveField?: (campoKey: string, strategy: DivergenciaResolutionStrategy) => void
  resolvingKey?: string | null
}) {
  const pendingCount = data.filter((d) => d.pending).length

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nenhum campo nesta categoria.
      </p>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-primary-50/60 border-b border-border">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700">Campo</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700">BL Final</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700">GlobalSys</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700 w-36">Status</th>
            {onResolveField && (
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700 w-44">Ações</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((d) => (
            <tr key={d.key} className={cn(d.pending && "bg-danger-50/40")}>
              <td className="px-4 py-3 font-medium text-primary-900">{d.label}</td>
              <td className={cn("px-4 py-3", d.pending && "font-semibold text-danger-700")}>{d.valorBlFinal || "—"}</td>
              <td className={cn("px-4 py-3", d.pending && "font-semibold text-danger-700")}>{d.valorGlobalSys || "—"}</td>
              <td className="px-4 py-3">{campoStatusBadge(d.status)}</td>
              {onResolveField && (
                <td className="px-4 py-3">
                  {d.pending ? (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={resolvingKey === d.key}
                        onClick={() => onResolveField(d.key, "aceitar_bl_final")}
                      >
                        BL
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={resolvingKey === d.key}
                        onClick={() => onResolveField(d.key, "aceitar_globalsys")}
                      >
                        GS
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {pendingCount > 0 && (
        <div className="bg-danger-50 px-4 py-2 text-xs text-danger-700 font-medium border-t border-danger-100">
          {pendingCount} campo(s) pendente(s) nesta seção
        </div>
      )}
    </div>
  )
}

export default function Divergencia() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { tipo, documentNumber, masterNumber, isValid } = useDocumentParams()

  const [divergencia, setDivergencia] = useState<DivergenciaLatestDetailDto | null>(null)
  const [resolvedCampos, setResolvedCampos] = useState<DivergenciaCampoResolutionDetailDto[]>([])
  const [workflow, setWorkflow] = useState<WorkflowSummaryDto | null>(null)
  const [timeline, setTimeline] = useState<ProcessoTimelineResponseDto | null>(null)
  const [blFinal, setBlFinal] = useState<BlFinalResponseDto | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const [resolvingKey, setResolvingKey] = useState<string | null>(null)
  const [recomparing, setRecomparing] = useState(false)

  const [workflowLoading, setWorkflowLoading] = useState(false)
  const [workflowError, setWorkflowError] = useState<string | null>(null)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineError, setTimelineError] = useState<string | null>(null)
  const [blFinalLoading, setBlFinalLoading] = useState(false)
  const [blFinalError, setBlFinalError] = useState<string | null>(null)

  const refreshWorkflow = useCallback(async () => {
    if (!isValid) return
    setWorkflowLoading(true)
    setWorkflowError(null)
    try {
      const result = await fetchWorkflow(tipo, documentNumber)
      setWorkflow(result)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erro ao carregar workflow."
      setWorkflowError(message)
      setWorkflow(null)
    } finally {
      setWorkflowLoading(false)
    }
  }, [documentNumber, isValid, tipo])

  const refreshTimeline = useCallback(async () => {
    if (!isValid) return
    setTimelineLoading(true)
    setTimelineError(null)
    try {
      const result = await fetchProcessoTimeline(tipo, documentNumber)
      setTimeline(result)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erro ao carregar timeline."
      setTimelineError(message)
      setTimeline(null)
    } finally {
      setTimelineLoading(false)
    }
  }, [documentNumber, isValid, tipo])

  const refreshBlFinal = useCallback(async () => {
    if (!masterNumber) return
    setBlFinalLoading(true)
    setBlFinalError(null)
    try {
      const result = await fetchBlFinal(masterNumber)
      setBlFinal(result)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erro ao carregar BL Final."
      setBlFinalError(message)
      setBlFinal(null)
    } finally {
      setBlFinalLoading(false)
    }
  }, [masterNumber])

  const loadDivergencia = useCallback(async () => {
    if (!isValid) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      let latest: DivergenciaLatestDetailDto

      try {
        latest = await fetchDivergenciaLatest(tipo, documentNumber)
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          await compareAndPersistDivergenciaGlobalSys(tipo, documentNumber)
          latest = await fetchDivergenciaLatest(tipo, documentNumber)
        } else {
          throw err
        }
      }

      setDivergencia(latest)
      setWorkflow(latest.workflow)
      setResolvedCampos([])
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : "Não foi possível carregar a divergência. Verifique se a API está rodando."
      setError(message)
      setDivergencia(null)
    } finally {
      setLoading(false)
    }
  }, [documentNumber, isValid, tipo])

  useEffect(() => {
    void loadDivergencia()
    void refreshWorkflow()
    void refreshTimeline()
    void refreshBlFinal()
  }, [loadDivergencia, refreshBlFinal, refreshTimeline, refreshWorkflow])

  const rows = useMemo(() => {
    if (!divergencia) return []
    return mapCamposToRows(divergencia.campos)
  }, [divergencia])

  const masterRows = rows.filter((r) => r.categoria === "master")
  const houseRows = rows.filter((r) => r.categoria === "house")
  const cargoRows = rows.filter((r) => r.categoria === "cargo")
  const ncmRows = rows.filter((r) => r.categoria === "ncm")

  const pendingCount = rows.filter((r) => r.pending).length
  const allResolved = divergencia?.status === "resolvido" || pendingCount === 0

  async function applyResolveResponse(result: Awaited<ReturnType<typeof resolveDivergencia>>) {
    setDivergencia(result.divergencia)
    setResolvedCampos(result.campos)
    if (result.workflow) setWorkflow(result.workflow)
    await Promise.all([refreshWorkflow(), refreshTimeline()])
  }

  async function handleBulkResolve(strategy: DivergenciaResolutionStrategy) {
    if (!divergencia) return

    setResolving(true)
    try {
      const result = await resolveDivergencia(divergencia.id, {
        resolutionStrategy: strategy,
        responsavelNome: user?.nome,
      })
      await applyResolveResponse(result)
      toast.success(
        strategy === "aceitar_bl_final"
          ? "Divergência resolvida com valores do BL Final."
          : "Divergência resolvida com valores do GlobalSys.",
      )
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erro ao resolver divergência."
      toast.error(message)
    } finally {
      setResolving(false)
    }
  }

  async function handleFieldResolve(campoKey: string, strategy: DivergenciaResolutionStrategy) {
    if (!divergencia) return

    setResolvingKey(campoKey)
    try {
      const result = await resolveDivergenciaCampo(divergencia.id, campoKey, {
        resolutionStrategy: strategy,
        responsavelNome: user?.nome,
      })
      await applyResolveResponse(result)
      toast.success(`Campo "${campoKey}" resolvido.`)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erro ao resolver campo."
      toast.error(message)
    } finally {
      setResolvingKey(null)
    }
  }

  async function handleRecompare() {
    if (!isValid) return
    setRecomparing(true)
    try {
      await compareDivergenciaGlobalSys(tipo, documentNumber)
      await compareAndPersistDivergenciaGlobalSys(tipo, documentNumber)
      await loadDivergencia()
      await refreshWorkflow()
      await refreshTimeline()
      toast.success("Comparação atualizada com sucesso.")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erro ao recomparar."
      toast.error(message)
    } finally {
      setRecomparing(false)
    }
  }

  const historicoItems = useMemo(() => {
    const fromResolution = resolvedCampos.filter((c) => c.resolvedAt)
    const fromCampos = (divergencia?.campos ?? [])
      .filter((c) => !isPendingCampoStatus(c.status))
      .map((c) => ({
        campoKey: c.campoKey,
        campoLabel: c.campoLabel,
        status: c.status,
        valorBlFinal: c.valorBlFinal,
        valorGlobalSys: c.valorGlobalSys,
        responsavelNome: null as string | null,
        observacao: null as string | null,
        resolvedAt: divergencia?.updatedAt ?? null,
      }))

    const merged = fromResolution.length > 0 ? fromResolution : fromCampos
    return merged.sort((a, b) => {
      const dateA = a.resolvedAt ? new Date(a.resolvedAt).getTime() : 0
      const dateB = b.resolvedAt ? new Date(b.resolvedAt).getTime() : 0
      return dateB - dateA
    })
  }, [divergencia, resolvedCampos])

  if (!isValid) {
    return (
      <ApiStatePanel
        variant="empty"
        title="Nenhum documento selecionado"
        description="Selecione um BL com divergência no dashboard para abrir esta tela."
        onRetry={() => navigate("/")}
        retryLabel="Ir para o Dashboard"
      />
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
          <p className="text-sm text-muted-foreground">Carregando divergência...</p>
        </div>
        <TableSkeleton rows={8} />
      </div>
    )
  }

  if (error || !divergencia) {
    return (
      <ApiStatePanel
        variant="error"
        title="Erro ao carregar divergência"
        description={error ?? "Dados indisponíveis."}
        onRetry={() => void loadDivergencia()}
      />
    )
  }

  const activeWorkflow = workflow ?? divergencia.workflow

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger-50 text-danger-600">
            <GitCompareArrows className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary-900">
              {divergencia.documentNumber} · {tipo}
            </h2>
            <p className="text-xs text-muted-foreground">
              {divergencia.origin?.label ?? "BL Final × GlobalSys"} — {pendingCount} pendente(s)
              {activeWorkflow?.pendencia ? ` · ${activeWorkflow.pendencia}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="danger" className="text-sm px-3 py-1">
            {divergencia.status}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => void handleRecompare()} disabled={recomparing}>
            {recomparing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
            Recomparar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metadados da Comparação</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Tipo comparação</span>
                <p className="font-medium">{divergencia.comparisonKind ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status comparação</span>
                <p className="font-medium">{comparisonStatusLabel(divergencia.comparisonStatus)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Origem</span>
                <p className="font-medium">{divergencia.origin?.label ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Data comparação
                </span>
                <p className="font-medium tabular-nums">{formatDateTime(divergencia.comparisonDate)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comparação de Campos</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="master">
                <TabsList>
                  <TabsTrigger value="master"><Ship className="h-3.5 w-3.5 mr-1" /> Master</TabsTrigger>
                  <TabsTrigger value="house"><Package className="h-3.5 w-3.5 mr-1" /> Houses</TabsTrigger>
                  <TabsTrigger value="cargo"><Boxes className="h-3.5 w-3.5 mr-1" /> Cargo</TabsTrigger>
                  <TabsTrigger value="ncm"><Hash className="h-3.5 w-3.5 mr-1" /> NCM</TabsTrigger>
                  <TabsTrigger value="historico"><History className="h-3.5 w-3.5 mr-1" /> Histórico</TabsTrigger>
                </TabsList>

                <TabsContent value="master">
                  <DivergenceTable
                    data={masterRows}
                    onResolveField={handleFieldResolve}
                    resolvingKey={resolvingKey}
                  />
                </TabsContent>
                <TabsContent value="house">
                  <DivergenceTable
                    data={houseRows}
                    onResolveField={handleFieldResolve}
                    resolvingKey={resolvingKey}
                  />
                </TabsContent>
                <TabsContent value="cargo">
                  <DivergenceTable
                    data={cargoRows}
                    onResolveField={handleFieldResolve}
                    resolvingKey={resolvingKey}
                  />
                </TabsContent>
                <TabsContent value="ncm">
                  <DivergenceTable
                    data={ncmRows}
                    onResolveField={handleFieldResolve}
                    resolvingKey={resolvingKey}
                  />
                </TabsContent>
                <TabsContent value="historico">
                  {historicoItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Nenhuma resolução registrada ainda.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {historicoItems.map((h) => (
                        <div key={h.campoKey} className="flex items-start gap-3 rounded-lg border border-border p-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                            <History className="h-4 w-4" />
                          </div>
                          <div className="flex-1 text-sm">
                            <p>
                              <span className="font-semibold text-primary-900">
                                {"responsavelNome" in h ? h.responsavelNome ?? user?.nome ?? "Sistema" : user?.nome ?? "Sistema"}
                              </span>{" "}
                              resolveu <span className="font-medium">{h.campoLabel}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              BL Final: <span className="font-medium">{h.valorBlFinal}</span>
                              {" · "}GlobalSys: <span className="font-medium">{h.valorGlobalSys}</span>
                            </p>
                            {"observacao" in h && h.observacao && (
                              <p className="text-xs text-muted-foreground mt-1">Obs: {h.observacao}</p>
                            )}
                            {h.resolvedAt && (
                              <p className="text-[11px] text-muted-foreground mt-1">
                                {formatDateTime(h.resolvedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
                <Button
                  variant="success"
                  onClick={() => void handleBulkResolve("aceitar_bl_final")}
                  disabled={resolving || allResolved}
                >
                  {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Aceitar BL
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleBulkResolve("aceitar_globalsys")}
                  disabled={resolving || allResolved}
                >
                  {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Manter GlobalSys
                </Button>
                <Button variant="secondary" disabled>
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                <Button variant="accent" disabled={resolving || allResolved}>
                  <Send className="h-4 w-4" /> Encaminhar
                </Button>
                {allResolved && (
                  <span className="ml-2 text-sm text-success-700 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Todas as divergências resolvidas
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <BlFinalView
            data={blFinal}
            loading={blFinalLoading}
            error={blFinalError}
            onRetry={() => void refreshBlFinal()}
          />
        </div>

        <div className="space-y-6">
          <WorkflowSummaryCard
            workflow={activeWorkflow}
            loading={workflowLoading}
            error={workflowError}
            onRetry={() => void refreshWorkflow()}
          />

          <Card>
            <CardHeader>
              <CardTitle>Timeline do Processo</CardTitle>
            </CardHeader>
            <CardContent>
              {timelineLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : timelineError ? (
                <ApiStatePanel
                  variant="error"
                  title="Erro na timeline"
                  description={timelineError}
                  onRetry={() => void refreshTimeline()}
                />
              ) : timeline ? (
                <ProcessoTimeline data={timeline} />
              ) : (
                <ApiStatePanel variant="empty" title="Timeline indisponível" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

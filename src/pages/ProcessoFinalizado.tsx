import { useCallback, useEffect, useState } from "react"
import {
  CheckCircle2, Clock, User, FileCheck, AlertTriangle, Ship,
  Download, Printer, RefreshCcw, History, GitBranch,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn, formatDateTime } from "@/lib/utils"
import { motion } from "framer-motion"
import { ApiError } from "@/lib/api/client"
import { fetchProcessoTimeline } from "@/lib/api/processo"
import { fetchWorkflow } from "@/lib/api/workflow"
import { fetchBlFinal } from "@/lib/api/bl-final"
import type {
  BlFinalResponseDto,
  DashboardBlListItemDto,
  ProcessoTimelineResponseDto,
  WorkflowSummaryDto,
} from "@/lib/api/types"
import { ProcessoEventsTable } from "@/components/processo/ProcessoEventsTable"
import { ProcessoEtapasCompact } from "@/components/processo/ProcessoEtapasCompact"
import { FinalizadoProcessNavigator } from "@/components/processo/FinalizadoProcessNavigator"
import { BlFinalView } from "@/components/bl-final/BlFinalView"
import { ApiStatePanel } from "@/components/shared/ApiStatePanel"
import { OperationalEmptyQueueCard } from "@/components/shared/OperationalEmptyQueueCard"
import { CardSkeleton } from "@/components/shared/LoadingSkeleton"
import { buildDocumentSearchParams, useDocumentParams } from "@/hooks/useDocumentParams"
import { fetchDashboard } from "@/lib/api/dashboard"
import { useNavigate } from "react-router-dom"

export default function ProcessoFinalizado() {
  const navigate = useNavigate()
  const { tipo, documentNumber, masterNumber, isValid } = useDocumentParams()

  const [workflow, setWorkflow] = useState<WorkflowSummaryDto | null>(null)
  const [timeline, setTimeline] = useState<ProcessoTimelineResponseDto | null>(null)
  const [blFinal, setBlFinal] = useState<BlFinalResponseDto | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolvingDefaultDocument, setResolvingDefaultDocument] = useState(!isValid)

  useEffect(() => {
    if (isValid) {
      setResolvingDefaultDocument(false)
      return
    }

    let cancelled = false

    async function resolveDefaultDocument() {
      setResolvingDefaultDocument(true)

      try {
        const result = await fetchDashboard({
          status: "finalizado",
          page: 1,
          pageSize: 1,
        })

        if (cancelled) return

        const first = result.items.data[0]
        if (first) {
          const params = buildDocumentSearchParams({
            tipo: first.tipo,
            documentNumber: first.numeroBl,
          })
          navigate(`/processo-finalizado?${params}`, { replace: true })
        }
      } catch {
        // Mantém estado vazio abaixo.
      } finally {
        if (!cancelled) {
          setResolvingDefaultDocument(false)
        }
      }
    }

    void resolveDefaultDocument()

    return () => {
      cancelled = true
    }
  }, [isValid, navigate])

  const loadData = useCallback(async () => {
    if (!isValid) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [workflowResult, timelineResult, blFinalResult] = await Promise.allSettled([
        fetchWorkflow(tipo, documentNumber),
        fetchProcessoTimeline(tipo, documentNumber),
        fetchBlFinal(masterNumber),
      ])

      if (workflowResult.status === "fulfilled") {
        setWorkflow(workflowResult.value)
      } else {
        setWorkflow(null)
      }

      if (timelineResult.status === "fulfilled") {
        setTimeline(timelineResult.value)
      } else {
        const err = timelineResult.reason
        throw err instanceof ApiError ? err : new Error("Erro ao carregar timeline.")
      }

      if (blFinalResult.status === "fulfilled") {
        setBlFinal(blFinalResult.value)
      } else {
        setBlFinal(null)
      }
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : "Não foi possível carregar o processo. Verifique se a API está rodando."
      setError(message)
      setTimeline(null)
    } finally {
      setLoading(false)
    }
  }, [documentNumber, isValid, masterNumber, tipo])

  useEffect(() => {
    void loadData()
  }, [loadData])

  function handleSelectProcess(item: DashboardBlListItemDto) {
    const params = buildDocumentSearchParams({
      tipo: item.tipo,
      documentNumber: item.numeroBl,
    })
    navigate(`/processo-finalizado?${params}`)
  }

  if (!isValid) {
    if (resolvingDefaultDocument) {
      return (
        <div className="flex gap-6">
          <div className="w-72 hidden lg:block"><CardSkeleton /></div>
          <div className="flex-1 space-y-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      )
    }

    return (
      <OperationalEmptyQueueCard
        title="Nenhum BL com processo finalizado"
        description="Todos os processos em andamento ainda não foram concluídos ou não há documentos finalizados disponíveis."
        onRetry={() => navigate("/")}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-72 hidden lg:block"><CardSkeleton /></div>
        <div className="flex-1 space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  if (error || !timeline) {
    return (
      <div className="flex flex-col lg:flex-row gap-6">
        <FinalizadoProcessNavigator
          currentTipo={tipo}
          currentDocumentNumber={documentNumber}
          onSelect={handleSelectProcess}
        />
        <ApiStatePanel
          variant="error"
          title="Erro ao carregar processo"
          description={error ?? "Dados indisponíveis."}
          onRetry={() => void loadData()}
        />
      </div>
    )
  }

  const resolvedEvents = timeline.events.filter(
    (e) => e.eventType === "resolucao_divergencia" || e.eventType === "divergencia",
  )
  const divergenciasEncontradas = resolvedEvents.filter((e) => e.eventType === "divergencia").length
  const divergenciasResolvidas = resolvedEvents.filter((e) => e.eventType === "resolucao_divergencia").length

  const firstEvent = timeline.events[0]
  const lastEvent = timeline.events[timeline.events.length - 1]
  const tempoProcessamento =
    firstEvent && lastEvent
      ? `${Math.max(1, Math.round((new Date(lastEvent.occurredAt).getTime() - new Date(firstEvent.occurredAt).getTime()) / 60000))} min`
      : "—"

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <FinalizadoProcessNavigator
        currentTipo={tipo}
        currentDocumentNumber={documentNumber}
        onSelect={handleSelectProcess}
      />

      <div className="flex-1 min-w-0 space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-success-100 bg-gradient-to-br from-success-50 to-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-success-100 text-success-600 shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-primary-900 truncate">{documentNumber}</h2>
              <p className="text-xs text-muted-foreground">
                {tipo} · Finalizado · {timeline.workflowStatus ?? workflow?.status ?? "—"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => void loadData()}>
              <RefreshCcw className="h-3.5 w-3.5" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" disabled><Download className="h-3.5 w-3.5" /> Exportar</Button>
            <Button variant="outline" size="sm" disabled><Printer className="h-3.5 w-3.5" /> Imprimir</Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatChip icon={Clock} label="Tempo" value={tempoProcessamento} />
          <StatChip
            icon={AlertTriangle}
            label="Divergências"
            value={`${divergenciasResolvidas}/${Math.max(divergenciasEncontradas, divergenciasResolvidas)}`}
            tone={divergenciasEncontradas === 0 || divergenciasResolvidas >= divergenciasEncontradas ? "success" : "warning"}
          />
          <StatChip
            icon={User}
            label="Responsável"
            value={workflow?.responsavelUserId ? `#${workflow.responsavelUserId}` : "—"}
          />
          <StatChip
            icon={FileCheck}
            label="Origem"
            value={timeline.source === "persistido" ? "Persistido" : timeline.source === "dinamico" ? "Dinâmico" : "Misto"}
          />
        </div>

        <Tabs defaultValue="eventos">
          <TabsList>
            <TabsTrigger value="eventos">
              <History className="h-3.5 w-3.5 mr-1.5" />
              Eventos ({timeline.events.length})
            </TabsTrigger>
            <TabsTrigger value="bl-final">
              <Ship className="h-3.5 w-3.5 mr-1.5" />
              BL Final
            </TabsTrigger>
            <TabsTrigger value="workflow">
              <GitBranch className="h-3.5 w-3.5 mr-1.5" />
              Workflow
            </TabsTrigger>
          </TabsList>

          <TabsContent value="eventos" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-semibold">Etapas concluídas</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <ProcessoEtapasCompact etapas={timeline.etapas} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold">Histórico de eventos</CardTitle>
                {lastEvent && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    Último: {formatDateTime(lastEvent.occurredAt)}
                  </span>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <ProcessoEventsTable events={timeline.events} maxHeight="max-h-72" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bl-final" className="mt-4">
            <BlFinalView
              data={blFinal}
              onRetry={() => void loadData()}
            />
          </TabsContent>

          <TabsContent value="workflow" className="mt-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary-600" />
                  Workflow
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3 text-sm">
                {workflow ? (
                  <>
                    <WorkflowRow label="Status" value={<Badge variant="neutral">{workflow.status}</Badge>} />
                    <WorkflowRow label="Pendência" value={workflow.pendencia ?? "Nenhuma"} />
                    <WorkflowRow label="Versão BL" value={workflow.blVersion} />
                    <WorkflowRow
                      label="Responsável"
                      value={workflow.responsavelUserId ? `Usuário #${workflow.responsavelUserId}` : "Não atribuído"}
                    />
                    <WorkflowRow label="Atualizado em" value={formatDateTime(workflow.updatedAt)} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Workflow não encontrado para este documento.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function StatChip({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ElementType
  label: string
  value: string
  tone?: "default" | "success" | "warning"
}) {
  const toneClass =
    tone === "success"
      ? "border-success-100 bg-success-50/50"
      : tone === "warning"
        ? "border-warning-100 bg-warning-50/50"
        : "border-border bg-white"

  return (
    <div className={cn("rounded-lg border px-3 py-2.5", toneClass)}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="text-sm font-bold text-primary-900 mt-0.5 truncate">{value}</p>
    </div>
  )
}

function WorkflowRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border/60 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-primary-900 text-right">{value}</span>
    </div>
  )
}

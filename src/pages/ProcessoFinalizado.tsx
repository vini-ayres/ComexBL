import { useCallback, useEffect, useState } from "react"
import {
  CheckCircle2, Clock, User, FileCheck, AlertTriangle, Ship,
  Download, Printer, Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/utils"
import { motion } from "framer-motion"
import { ApiError } from "@/lib/api/client"
import { fetchProcessoTimeline } from "@/lib/api/processo"
import { fetchWorkflow } from "@/lib/api/workflow"
import { fetchBlFinal } from "@/lib/api/bl-final"
import type {
  BlFinalResponseDto,
  ProcessoTimelineResponseDto,
  WorkflowSummaryDto,
} from "@/lib/api/types"
import { ProcessoTimeline } from "@/components/processo/ProcessoTimeline"
import { WorkflowSummaryCard } from "@/components/workflow/WorkflowSummaryCard"
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

  if (!isValid) {
    if (resolvingDefaultDocument) {
      return (
        <div className="space-y-6">
          <CardSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CardSkeleton />
            <div className="lg:col-span-2"><CardSkeleton /></div>
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
      <div className="space-y-6">
        <CardSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <div className="lg:col-span-2"><CardSkeleton /></div>
        </div>
      </div>
    )
  }

  if (error || !timeline) {
    return (
      <ApiStatePanel
        variant="error"
        title="Erro ao carregar processo"
        description={error ?? "Dados indisponíveis."}
        onRetry={() => void loadData()}
      />
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
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-success-100 bg-gradient-to-br from-success-50 to-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-100 text-success-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary-900">Processo Finalizado com Sucesso</h2>
            <p className="text-sm text-muted-foreground">
              {documentNumber} · {tipo} — status workflow: {timeline.workflowStatus ?? workflow?.status ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled><Download className="h-4 w-4" /> Exportar</Button>
          <Button variant="outline" size="sm" disabled><Printer className="h-4 w-4" /> Imprimir</Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SummaryRow icon={Ship} label="Número BL" value={documentNumber} />
              <SummaryRow icon={FileCheck} label="Tipo" value={tipo} />
              <SummaryRow
                icon={User}
                label="Responsável"
                value={workflow?.responsavelUserId ? `Usuário #${workflow.responsavelUserId}` : "Não atribuído"}
              />
              <SummaryRow icon={Clock} label="Tempo de Processamento" value={tempoProcessamento} />
              <SummaryRow
                icon={Clock}
                label="Origem timeline"
                value={timeline.source === "persistido" ? "Persistido" : timeline.source === "dinamico" ? "Dinâmico" : "Misto"}
              />
              {lastEvent && (
                <SummaryRow icon={Clock} label="Último evento" value={formatDateTime(lastEvent.occurredAt)} />
              )}

              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Divergências
                  </span>
                  <Badge variant={divergenciasEncontradas === 0 || divergenciasResolvidas >= divergenciasEncontradas ? "success" : "warning"}>
                    {divergenciasResolvidas}/{Math.max(divergenciasEncontradas, divergenciasResolvidas)} resolvidas
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <WorkflowSummaryCard workflow={workflow} onRetry={() => void loadData()} />
        </div>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Linha do Tempo do Processo</CardTitle>
            <Button variant="outline" size="sm" onClick={() => void loadData()}>
              <Loader2 className="h-3.5 w-3.5" />
              Atualizar
            </Button>
          </CardHeader>
          <CardContent>
            <ProcessoTimeline data={timeline} />
          </CardContent>
        </Card>
      </div>

      <BlFinalView
        data={blFinal}
        onRetry={() => void loadData()}
      />
    </div>
  )
}

function SummaryRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm gap-3">
      <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="font-semibold text-primary-900 text-right">{value}</span>
    </div>
  )
}

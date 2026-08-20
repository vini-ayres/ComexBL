import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CheckCircle2, XCircle, GitCompareArrows,
  Loader2, RefreshCcw, ChevronLeft, ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ApiError } from "@/lib/api/client"
import {
  compareAndPersistDivergenciaGlobalSys,
  fetchDivergenciaLatest,
  resolveDivergencia,
  resolveDivergenciaCampo,
} from "@/lib/api/divergencia"
import type {
  DashboardBlListItemDto,
  DivergenciaLatestDetailDto,
  DivergenciaResolutionStrategy,
} from "@/lib/api/types"
import { DivergenceSectionTables } from "@/components/divergencia/DivergenceFieldTables"
import {
  groupAllDivergenceSections,
  mapCamposToDisplayRows,
} from "@/lib/divergencia/field-display"
import { ApiStatePanel } from "@/components/shared/ApiStatePanel"
import { OperationalEmptyQueueCard } from "@/components/shared/OperationalEmptyQueueCard"
import { TableSkeleton } from "@/components/shared/LoadingSkeleton"
import { buildDocumentSearchParams, useDocumentParams } from "@/hooks/useDocumentParams"
import { fetchDashboard } from "@/lib/api/dashboard"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

function hasResolvedCampo(status: string): boolean {
  return status.startsWith("resolvido")
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    resolvido: "Resolvido",
    sem_divergencia: "Sem divergência",
    completo_sem_divergencia: "Valores conferem",
    completo_com_divergencia: "Diferenças encontradas",
    documento_incompleto: "Documento incompleto",
    erro_comparacao: "Erro na comparação",
  }
  return labels[status] ?? status
}

export default function Divergencia() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { tipo, documentNumber, isValid } = useDocumentParams()

  const [divergencia, setDivergencia] = useState<DivergenciaLatestDetailDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const [resolvingKey, setResolvingKey] = useState<string | null>(null)
  const [recomparing, setRecomparing] = useState(false)
  const [resolvingDefaultDocument, setResolvingDefaultDocument] = useState(!isValid)
  const [queue, setQueue] = useState<DashboardBlListItemDto[]>([])
  const [queueLoading, setQueueLoading] = useState(false)

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
          status: "divergencia",
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
          navigate(`/divergencia?${params}`, { replace: true })
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

  const loadQueue = useCallback(async () => {
    setQueueLoading(true)
    try {
      const result = await fetchDashboard({
        status: "divergencia",
        page: 1,
        pageSize: 100,
      })
      setQueue(result.items.data)
    } catch {
      setQueue([])
    } finally {
      setQueueLoading(false)
    }
  }, [])

  const goToQueueItem = useCallback((item: DashboardBlListItemDto) => {
    navigate(`/divergencia?${buildDocumentSearchParams({
      tipo: item.tipo,
      documentNumber: item.numeroBl,
    })}`)
  }, [navigate])

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
        const alreadyResolved = latest.campos.some((campo) => hasResolvedCampo(campo.status))
        if (!alreadyResolved) {
          await compareAndPersistDivergenciaGlobalSys(tipo, documentNumber)
          latest = await fetchDivergenciaLatest(tipo, documentNumber)
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          await compareAndPersistDivergenciaGlobalSys(tipo, documentNumber)
          latest = await fetchDivergenciaLatest(tipo, documentNumber)
        } else {
          throw err
        }
      }

      setDivergencia(latest)
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
    void loadQueue()
  }, [loadDivergencia, loadQueue])

  const queueIndex = useMemo(
    () => queue.findIndex((item) => item.numeroBl === documentNumber),
    [documentNumber, queue],
  )
  const queuePage = queueIndex >= 0 ? queueIndex + 1 : 1
  const queueTotal = queue.length
  const showQueueNav = queueTotal > 1

  const rows = useMemo(() => {
    if (!divergencia) return []
    return mapCamposToDisplayRows(divergencia.campos)
  }, [divergencia])

  const sections = useMemo(() => groupAllDivergenceSections(rows), [rows])
  const pendingCount = rows.filter((row) => row.pending).length
  const matchingCount = rows.filter((row) => row.status === "igual").length
  const allResolved = divergencia?.status === "resolvido"
    || divergencia?.status === "sem_divergencia"
    || pendingCount === 0

  async function applyResolveResponse(result: Awaited<ReturnType<typeof resolveDivergencia>>) {
    setDivergencia(result.divergencia)
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

      const allResolvedNow = result.summary.allResolved
      const remaining = queue.filter((item) => item.numeroBl !== documentNumber)
      const next = remaining[Math.max(queueIndex, 0)] ?? remaining[0]

      toast.success(
        allResolvedNow && next
          ? strategy === "aceitar_bl_final"
            ? "BL aceito. Carregando próximo BL da fila..."
            : "GlobalSys mantido. Carregando próximo BL da fila..."
          : strategy === "aceitar_bl_final"
            ? "BL aceito. Um novo XML será gerado e enviado ao EDI."
            : "Valores do GlobalSys mantidos. Processo finalizado, sem envio de XML.",
      )

      if (allResolvedNow) {
        if (next) {
          goToQueueItem(next)
          return
        }
        await loadQueue()
      }
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
      toast.success("Campo resolvido.")
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
      await compareAndPersistDivergenciaGlobalSys(tipo, documentNumber)
      const latest = await fetchDivergenciaLatest(tipo, documentNumber)
      setDivergencia(latest)
      toast.success("Comparação atualizada com sucesso.")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erro ao recomparar."
      toast.error(message)
    } finally {
      setRecomparing(false)
    }
  }

  function goToPrevious() {
    const previous = queueIndex > 0 ? queue[queueIndex - 1] : undefined
    if (previous) {
      goToQueueItem(previous)
    }
  }

  function goToNext() {
    const next = queueIndex >= 0 && queueIndex < queueTotal - 1
      ? queue[queueIndex + 1]
      : undefined
    if (next) {
      goToQueueItem(next)
    }
  }

  if (!isValid) {
    if (resolvingDefaultDocument) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            <p className="text-sm text-muted-foreground">Localizando BL com divergência...</p>
          </div>
          <TableSkeleton rows={8} />
        </div>
      )
    }

    return (
      <OperationalEmptyQueueCard
        title="Nenhum BL pendente de divergência"
        description="Todos os documentos foram validados ou não possuem divergências pendentes em relação ao GlobalSys."
        onRetry={() => navigate("/")}
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
              BL Final × GlobalSys
              {pendingCount > 0 ? ` · ${pendingCount} pendente(s)` : ""}
              {matchingCount > 0 ? ` · ${matchingCount} conferem` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={pendingCount > 0 ? "danger" : "success"} className="text-sm px-3 py-1">
            {statusLabel(divergencia.status)}
          </Badge>
          {showQueueNav && (
            <>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-white px-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={queueIndex <= 0 || queueLoading}
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-medium text-primary-800 px-2 min-w-[80px] text-center">
                  {queueLoading ? "..." : `${queuePage} / ${queueTotal}`}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={queueIndex < 0 || queueIndex >= queueTotal - 1 || queueLoading}
                  onClick={goToNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">{queueTotal} BL(s) na fila</span>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => void handleRecompare()} disabled={recomparing}>
            {recomparing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
            Recomparar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comparação de campos</CardTitle>
        </CardHeader>
        <CardContent>
          <DivergenceSectionTables
            sections={sections}
            onResolveField={handleFieldResolve}
            resolvingKey={resolvingKey}
          />

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
            {allResolved && (
              <span className="ml-2 text-sm text-success-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Todas as divergências resolvidas
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

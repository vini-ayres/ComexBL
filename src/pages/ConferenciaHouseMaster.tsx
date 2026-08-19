import { useCallback, useEffect, useState } from "react"
import {
  CheckCircle2, Scale, Loader2, RefreshCcw, Clock, Pencil,
  ChevronLeft, ChevronRight, AlertCircle, Ship, Package,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ApiError } from "@/lib/api/client"
import {
  compareAndPersistConferencia,
  fetchConferenciaQueue,
  resolveConferencia,
  resolveConferenciaCampo,
} from "@/lib/api/conferencia-house-master"
import type {
  ConferenciaDocumentoDto,
  ConferenciaQueueItemDto,
  ConferenciaResolutionStrategy,
} from "@/lib/api/types"
import { ConferenciaFieldTables } from "@/components/conferencia/ConferenciaFieldTables"
import { DocumentViewer } from "@/components/shared/DocumentViewer"
import { OperationalEmptyQueueCard } from "@/components/shared/OperationalEmptyQueueCard"
import { useAuth } from "@/hooks/useAuth"
import { formatDateTime } from "@/lib/utils"
import { toast } from "sonner"

function isPendingCampoStatus(status: string): boolean {
  return status === "pendente"
}

function comparisonStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    completo_sem_divergencia: "Valores conferem",
    completo_com_divergencia: "Diferenças encontradas",
    documento_incompleto: "Documento incompleto",
    erro_comparacao: "Erro na comparação",
  }
  return labels[status] ?? status
}

function emptyDocumento(tipo: "Master" | "House"): ConferenciaDocumentoDto {
  return {
    tipo,
    numeroBl: "—",
    nome: tipo === "Master" ? "Master não vinculado" : "House não vinculado",
    origemPath: "files/pendentes",
    fileName: null,
    blVersion: "",
  }
}

export default function ConferenciaHouseMaster() {
  const { user } = useAuth()

  const [queueItem, setQueueItem] = useState<ConferenciaQueueItemDto | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const [resolvingKey, setResolvingKey] = useState<string | null>(null)
  const [recomparing, setRecomparing] = useState(false)

  const loadQueue = useCallback(async (targetPage: number) => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetchConferenciaQueue(targetPage)
      setQueueItem(result)
      setPage(result.pagination.page)
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : "Não foi possível carregar a conferência. Verifique se a API está rodando."
      setError(message)
      setQueueItem(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadQueue(page)
  }, [page, loadQueue])

  const conferencia = queueItem?.conferencia ?? null
  const pendingCount = conferencia?.campos.filter((campo) => isPendingCampoStatus(campo.status)).length ?? 0
  const allResolved = conferencia?.status === "resolvido"
    || conferencia?.status === "sem_divergencia"
    || pendingCount === 0
  const totalPages = queueItem?.pagination.totalPages ?? 1
  const totalItems = queueItem?.pagination.total ?? 0

  async function applyResolveResponse(result: Awaited<ReturnType<typeof resolveConferencia>>) {
    setQueueItem((current) =>
      current
        ? { ...current, conferencia: result.conferencia }
        : current,
    )

    if (result.summary.allResolved) {
      toast.success("Conferência concluída. Carregando próximo BL da fila...")
      if (page === 1) {
        await loadQueue(1)
      } else {
        setPage(1)
      }
    }
  }

  async function handleBulkResolve(strategy: ConferenciaResolutionStrategy) {
    if (!conferencia) return

    setResolving(true)
    try {
      const result = await resolveConferencia(conferencia.id, {
        resolutionStrategy: strategy,
        responsavelNome: user?.nome,
      })
      await applyResolveResponse(result)
      if (!result.summary.allResolved) {
        toast.success(
          strategy === "aceitar_house"
            ? "Valores do House aplicados no documento."
            : "Valores do Master aplicados no documento.",
        )
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erro ao resolver conferência."
      toast.error(message)
    } finally {
      setResolving(false)
    }
  }

  async function handleFieldResolve(
    campoKey: string,
    strategy: ConferenciaResolutionStrategy,
    manualValue?: string,
  ) {
    if (!conferencia) return

    setResolvingKey(campoKey)
    try {
      const result = await resolveConferenciaCampo(conferencia.id, campoKey, {
        resolutionStrategy: strategy,
        manualValue,
        responsavelNome: user?.nome,
      })
      await applyResolveResponse(result)
      if (!result.summary.allResolved) {
        toast.success(
          strategy === "manual"
            ? "Campo corrigido manualmente."
            : `Campo "${campoKey}" resolvido.`,
        )
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erro ao resolver campo."
      toast.error(message)
    } finally {
      setResolvingKey(null)
    }
  }

  async function handleRecompare() {
    if (!conferencia) return
    setRecomparing(true)
    try {
      await compareAndPersistConferencia(conferencia.documentType, conferencia.documentNumber)
      await loadQueue(page)
      toast.success("Conferência atualizada com sucesso.")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erro ao recomparar."
      toast.error(message)
    } finally {
      setRecomparing(false)
    }
  }

  if (loading && !queueItem) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Carregando conferências pendentes...</p>
      </div>
    )
  }

  if (error && !queueItem) {
    const isEmptyQueue =
      error.toLowerCase().includes("nenhuma conferência pendente")
      || error.toLowerCase().includes("nenhuma conferencia pendente")

    if (isEmptyQueue) {
      return (
        <OperationalEmptyQueueCard
          title="Nenhuma conferência pendente"
          description="Não há diferenças de peso, volume ou embalagem entre House e Master aguardando conferência."
        />
      )
    }

    return (
      <div className="rounded-xl border border-border bg-white px-4 py-12 text-center">
        <AlertCircle className="h-8 w-8 text-danger-600 mx-auto mb-3" />
        <p className="text-sm text-danger-700">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => void loadQueue(page)}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (!queueItem || !conferencia) return null

  const counterpart = conferencia.counterpart
  const masterDocumento = queueItem.documentos.master ?? emptyDocumento("Master")
  const houseDocumento = queueItem.documentos.house ?? emptyDocumento("House")

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info-50 text-info-600">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary-900">
              {conferencia.documentNumber} · {conferencia.documentType}
            </h2>
            <p className="text-xs text-muted-foreground">
              House × Master — {pendingCount} diferença(s) pendente(s)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="info">Conferência House/Master</Badge>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-white px-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium text-primary-800 px-2 min-w-[80px] text-center">
              {loading ? "..." : `${page} / ${totalPages}`}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">{totalItems} BL(s) na fila</span>
          <Button variant="outline" size="sm" onClick={() => void handleRecompare()} disabled={recomparing || loading}>
            {recomparing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
            Recomparar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4 xl:sticky xl:top-20 h-fit">
          <DocumentViewer
            nome={`Master · ${masterDocumento.numeroBl}`}
            origemPath={masterDocumento.origemPath}
            fileName={masterDocumento.fileName}
            blVersion={masterDocumento.blVersion}
            compact
          />
          <DocumentViewer
            nome={`House · ${houseDocumento.numeroBl}`}
            origemPath={houseDocumento.origemPath}
            fileName={houseDocumento.fileName}
            blVersion={houseDocumento.blVersion}
            compact
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metadados da Conferência</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Versão</span>
                <p className="font-medium">{counterpart.blVersion}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status comparação</span>
                <p className="font-medium">{comparisonStatusLabel(conferencia.comparisonStatus)}</p>
              </div>
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Ship className="h-3.5 w-3.5" /> Master
                </span>
                <p className="font-medium">{counterpart.masterNumber ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" />
                  {counterpart.houseAggregate ? "Houses (soma)" : "House"}
                </span>
                <p className="font-medium">
                  {counterpart.houseNumbers.length > 0
                    ? counterpart.houseNumbers.join(", ")
                    : "—"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Data comparação
                </span>
                <p className="font-medium tabular-nums">{formatDateTime(conferencia.comparisonDate)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Comparação de Valores</CardTitle>
              <span className="text-xs text-muted-foreground">
                BL {page} de {totalPages}
              </span>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <ConferenciaFieldTables
                  campos={conferencia.campos}
                  onResolveField={handleFieldResolve}
                  resolvingKey={resolvingKey}
                />
              )}

              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
                <Button
                  variant="success"
                  onClick={() => void handleBulkResolve("aceitar_house")}
                  disabled={resolving || allResolved || loading}
                >
                  {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Aceitar House
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleBulkResolve("aceitar_master")}
                  disabled={resolving || allResolved || loading}
                >
                  {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
                  Aceitar Master
                </Button>
                <Button variant="secondary" disabled>
                  <Pencil className="h-4 w-4" /> Editar campo na tabela
                </Button>
                {allResolved && (
                  <span className="ml-2 text-sm text-success-700 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Conferência concluída
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

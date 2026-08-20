import { useEffect, useMemo, useState } from "react"
import {
  History, Ship, Package, ChevronRight, Box, Loader2, AlertCircle,
  Link2, Unlink, Send, BadgeCheck,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/components/shared/StatusBadge"
import {
  dispatchMasterXml,
  fetchBlMasterById,
  fetchBlMasters,
  linkHouseToMaster,
  unlinkHouseFromMaster,
  validacaoManualMaster,
} from "@/lib/api/bl"
import type { BlMasterDetailDto, BlMasterSummaryDto, LotStatus, XmlDispatchUiStatus } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { buildDocumentSearchParams } from "@/hooks/useDocumentParams"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

const LOT_LABELS: Record<LotStatus, { label: string; variant: "danger" | "warning" | "info" | "success" | "neutral" }> = {
  count_ausente: { label: "Sem House", variant: "warning" },
  master_nao_finalizado: { label: "Master pendente", variant: "info" },
  aguardando_house: { label: "Aguarda House", variant: "warning" },
  house_nao_finalizado: { label: "House pendente", variant: "warning" },
  pronto: { label: "Pronto XML", variant: "success" },
  xml_enviado: { label: "XML enviado", variant: "success" },
  xml_falhou: { label: "Falha XML", variant: "danger" },
}

const XML_LABELS: Record<XmlDispatchUiStatus, { label: string; variant: "danger" | "warning" | "info" | "success" | "neutral" }> = {
  nao_enviado: { label: "Não enviado", variant: "neutral" },
  pendente: { label: "Enviando", variant: "info" },
  enviado: { label: "XML enviado", variant: "success" },
  falhou: { label: "Falha XML", variant: "danger" },
}

type LotFilter = "todos" | "partlot" | "aguardando_xml" | "enviados"

export default function BLDatabase() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canEdit = hasPermission("editar_bl")

  const [masters, setMasters] = useState<BlMasterSummaryDto[]>([])
  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null)
  const [selectedMaster, setSelectedMaster] = useState<BlMasterDetailDto | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [blVersion, setBlVersion] = useState<string>("todos")
  const [lotFilter, setLotFilter] = useState<LotFilter>("todos")

  useEffect(() => {
    let cancelled = false

    async function loadMasters() {
      setLoadingList(true)
      setError(null)

      try {
        const result = await fetchBlMasters(1, 200, {
          search: search.trim() || undefined,
          blVersion: blVersion === "todos" ? undefined : blVersion,
        })
        if (cancelled) return

        setMasters(result.data)

        if (result.data.length > 0) {
          setSelectedMasterId((current) =>
            current != null && result.data.some((item) => item.id === current)
              ? current
              : result.data[0].id,
          )
        } else {
          setSelectedMasterId(null)
        }
      } catch (err) {
        if (cancelled) return
        const message = err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o histórico de XML. Verifique se a API está rodando."
        setError(message)
      } finally {
        if (!cancelled) setLoadingList(false)
      }
    }

    void loadMasters()
    return () => { cancelled = true }
  }, [search, blVersion])

  useEffect(() => {
    if (selectedMasterId == null) {
      setSelectedMaster(null)
      return
    }

    let cancelled = false

    async function loadDetail() {
      setLoadingDetail(true)

      try {
        const detail = await fetchBlMasterById(selectedMasterId!)
        if (!cancelled) setSelectedMaster(detail)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os detalhes do XML."
        setError(message)
        setSelectedMaster(null)
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    }

    void loadDetail()
    return () => { cancelled = true }
  }, [selectedMasterId])

  const visibleMasters = useMemo(() => {
    return masters.filter((master) => {
      if (lotFilter === "partlot") return master.partlot
      if (lotFilter === "aguardando_xml") {
        return master.lotStatus === "pronto" || master.lotStatus === "xml_falhou"
      }
      if (lotFilter === "enviados") return master.lotStatus === "xml_enviado"
      return true
    })
  }, [masters, lotFilter])

  const relatedHouses = selectedMaster?.houses ?? []
  const candidateHouses = selectedMaster?.candidateHouses ?? []
  const isLotConcluido = Boolean(
    selectedMaster &&
    selectedMaster.workflowStatus === "finalizado" &&
    relatedHouses.every((house) => house.status === "finalizado"),
  )

  async function refreshSelected() {
    if (selectedMasterId == null) return
    const detail = await fetchBlMasterById(selectedMasterId)
    setSelectedMaster(detail)
    setMasters((current) =>
      current.map((item) => (item.id === detail.id ? { ...item, ...detail } : item)),
    )
  }

  async function handleDispatch(force: boolean, houseId?: number) {
    if (!selectedMaster) return
    if (force && !window.confirm("Reenviar o XML deste Master/House?")) {
      return
    }

    setSaving(true)
    try {
      const result = await dispatchMasterXml(selectedMaster.id, force, houseId)
      setSelectedMaster(result.lot)
      toast.success(result.evaluation.reason)
      await refreshSelected()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao disparar XML")
    } finally {
      setSaving(false)
    }
  }

  async function handleValidacaoManual() {
    if (!selectedMaster) return
    if (
      !window.confirm(
        "Marcar esta pendência como concluída? Use quando a correção já foi feita no GlobalSys. Nenhum XML será enviado.",
      )
    ) {
      return
    }

    setSaving(true)
    try {
      const detail = await validacaoManualMaster(selectedMaster.id)
      setSelectedMaster(detail)
      toast.success("Pendência concluída por validação manual")
      await refreshSelected()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha na validação manual")
    } finally {
      setSaving(false)
    }
  }

  async function handleLink(houseId: number) {
    if (!selectedMaster) return
    setSaving(true)
    try {
      const detail = await linkHouseToMaster(selectedMaster.id, houseId)
      setSelectedMaster(detail)
      toast.success("House agregado ao Master")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao agregar House")
    } finally {
      setSaving(false)
    }
  }

  async function handleUnlink(houseId: number) {
    if (!selectedMaster) return
    if (!window.confirm("Desvincular este House do Master?")) return
    setSaving(true)
    try {
      const detail = await unlinkHouseFromMaster(selectedMaster.id, houseId)
      setSelectedMaster(detail)
      toast.success("House desvinculado")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao desvincular House")
    } finally {
      setSaving(false)
    }
  }

  function openHouse(status: string, numeroHbl: string) {
    const path = status === "divergencia"
      ? "/divergencia"
      : status === "conferencia_house_master"
        ? "/conferencia-house-master"
        : status === "apoio_humano"
          ? "/apoio-humano"
          : status === "finalizado"
            ? "/processo-finalizado"
            : "/"
    navigate(`${path}?${buildDocumentSearchParams({ tipo: "House", documentNumber: numeroHbl })}`)
  }

  function formatDispatchedAt(value: string | null | undefined) {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString("pt-BR")
  }

  return (
    <div className="space-y-4 min-w-0 max-w-full overflow-x-hidden">
      {error && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 flex items-start gap-3 text-sm text-danger-700 min-w-0">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-6 min-w-0">
        <Card className="h-fit lg:h-[calc(100vh-10rem)] lg:max-h-[calc(100vh-10rem)] overflow-hidden flex flex-col">
          <CardHeader className="shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4" /> Envios
            </CardTitle>
            <CardDescription>
              {loadingList ? "Carregando..." : `${visibleMasters.length} registros`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 flex-1 min-h-0 flex flex-col gap-3">
            <div className="shrink-0 space-y-3">
              <Input
                placeholder="Buscar Master, navio ou viagem"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Select value={blVersion} onValueChange={setBlVersion}>
                  <SelectTrigger><SelectValue placeholder="Versão" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas versões</SelectItem>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="FINAL">FINAL</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={lotFilter} onValueChange={(value) => setLotFilter(value as LotFilter)}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="partlot">Partlot</SelectItem>
                    <SelectItem value="aguardando_xml">Aguardando XML</SelectItem>
                    <SelectItem value="enviados">XML enviado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex-1 min-h-0 max-h-[24rem] lg:max-h-none overflow-y-auto scrollbar-thin space-y-2 pr-1">
              {loadingList && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}

              {!loadingList && visibleMasters.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                  <Box className="h-8 w-8" />
                  <p className="text-sm">Nenhum envio encontrado</p>
                </div>
              )}

              {visibleMasters.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMasterId(m.id)}
                  className={cn(
                    "w-full text-left rounded-lg border px-3 py-3 transition-colors",
                    selectedMasterId === m.id ? "border-primary-300 bg-primary-50" : "border-transparent hover:bg-secondary/60"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="font-semibold text-sm text-primary-900 truncate">{m.numeroBl}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{m.blVersion}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {m.containerNumber ?? "Sem container"} · {m.houseCount} House{m.houseCount === 1 ? "" : "s"}
                    {m.partlot ? " · Partlot" : ""}
                  </p>
                  <div className="flex items-center justify-end mt-2">
                    <LotBadge status={m.lotStatus} />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          {!selectedMaster && !loadingDetail && (
            <CardContent className="py-16 text-center text-muted-foreground text-sm">
              Selecione um Master para ver o histórico de XML
            </CardContent>
          )}

          {(loadingDetail || selectedMaster) && (
            <>
              <CardHeader className="flex-col sm:flex-row items-start justify-between space-y-2 sm:space-y-0 gap-3 p-4 min-w-0">
                <div className="min-w-0">
                  {loadingDetail ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      <span className="text-sm">Carregando detalhes...</span>
                    </div>
                  ) : selectedMaster ? (
                    <>
                      <CardTitle className="flex flex-wrap items-center gap-2 min-w-0">
                        <Ship className="h-4 w-4 shrink-0" />
                        <span className="truncate">{selectedMaster.numeroBl}</span>
                        <Badge variant="outline" className="shrink-0">{selectedMaster.blVersion}</Badge>
                        {selectedMaster.partlot && <Badge variant="accent" className="shrink-0">Partlot</Badge>}
                      </CardTitle>
                      <CardDescription className="truncate">
                        {selectedMaster.containerNumber ?? "Sem container"} · {selectedMaster.navio} · Viagem {selectedMaster.viagem}
                      </CardDescription>
                    </>
                  ) : null}
                </div>
                {selectedMaster && (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <StatusBadge status={selectedMaster.workflowStatus} />
                    <LotBadge status={selectedMaster.lotStatus} />
                  </div>
                )}
              </CardHeader>

              {selectedMaster && (
                <CardContent className="p-4 pt-0 min-w-0 space-y-4">
                  {canEdit && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={saving || selectedMaster.lotStatus === "xml_enviado"}
                        onClick={() => void handleDispatch(false)}
                      >
                        <Send className="h-3.5 w-3.5" />
                        Enviar XML pendente
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saving}
                        onClick={() => void handleDispatch(true)}
                      >
                        Reenviar todos
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saving || isLotConcluido}
                        onClick={() => void handleValidacaoManual()}
                      >
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Validação manual
                      </Button>
                    </div>
                  )}

                  {selectedMaster.xmlDispatchError && (
                    <p className="text-xs text-danger-700 break-words">
                      Último erro de XML: {selectedMaster.xmlDispatchError}
                    </p>
                  )}

                  <div className="space-y-2 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Houses e XML
                    </p>
                    {relatedHouses.map((h) => (
                      <div key={h.id} className="rounded-lg border border-border p-3 min-w-0 space-y-2">
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <button
                            className="flex items-center gap-3 text-left min-w-0 flex-1"
                            onClick={() => openHouse(h.status, h.numeroHbl)}
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600 shrink-0">
                              <Package className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-primary-900 truncate">{h.numeroHbl}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {formatDispatchedAt(h.xmlDispatchedAt) ?? h.descricaoMercadoria}
                              </p>
                            </div>
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            <StatusBadge status={h.status} className="text-[10px]" />
                            <XmlBadge status={h.xmlDispatchStatus ?? "nao_enviado"} />
                            {canEdit && (
                              <Button size="icon" variant="ghost" className="h-8 w-8" disabled={saving} onClick={() => void handleUnlink(h.id)}>
                                <Unlink className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                          </div>
                        </div>
                        {h.xmlDispatchError && (
                          <p className="text-xs text-danger-700 break-words">{h.xmlDispatchError}</p>
                        )}
                        {canEdit && h.status === "finalizado" && h.xmlDispatchStatus !== "enviado" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={saving}
                            onClick={() => void handleDispatch(false, h.id)}
                          >
                            <Send className="h-3.5 w-3.5" />
                            Enviar XML deste House
                          </Button>
                        )}
                        {canEdit && h.xmlDispatchStatus === "enviado" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={() => void handleDispatch(true, h.id)}
                          >
                            Reenviar XML deste House
                          </Button>
                        )}
                      </div>
                    ))}
                    {relatedHouses.length === 0 && (
                      <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                        <Box className="h-8 w-8" />
                        <p className="text-sm">Nenhum House vinculado a este Master</p>
                      </div>
                    )}

                    {candidateHouses.length > 0 && (
                      <div className="pt-2 min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          Mesmo container — agregar ao Master
                        </p>
                        {candidateHouses.map((h) => (
                          <div key={h.id} className="flex items-center justify-between rounded-lg border border-dashed p-3 gap-2 mb-2 min-w-0">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-primary-900 truncate">{h.numeroHbl}</p>
                              <p className="text-xs text-muted-foreground truncate">{h.containerNumber}</p>
                            </div>
                            {canEdit && (
                              <Button size="sm" variant="secondary" disabled={saving} onClick={() => void handleLink(h.id)}>
                                <Link2 className="h-3.5 w-3.5" />
                                Agregar
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

function LotBadge({ status }: { status: LotStatus }) {
  const config = LOT_LABELS[status]
  return (
    <Badge variant={config.variant} className="text-[10px] px-1.5 py-0 shrink-0 whitespace-nowrap">
      {config.label}
    </Badge>
  )
}

function XmlBadge({ status }: { status: XmlDispatchUiStatus }) {
  const config = XML_LABELS[status]
  return (
    <Badge variant={config.variant} className="text-[10px] px-1.5 py-0 shrink-0 whitespace-nowrap">
      {config.label}
    </Badge>
  )
}

import { useEffect, useState } from "react"
import { Database, Ship, Package, ChevronRight, Box, Container as ContainerIcon, Loader2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { fetchBlMasterById, fetchBlMasters } from "@/lib/api/bl"
import type { BlMasterDetailDto, BlMasterSummaryDto } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import { cn } from "@/lib/utils"

export default function BLDatabase() {
  const [masters, setMasters] = useState<BlMasterSummaryDto[]>([])
  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null)
  const [selectedMaster, setSelectedMaster] = useState<BlMasterDetailDto | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadMasters() {
      setLoadingList(true)
      setError(null)

      try {
        const result = await fetchBlMasters(1, 200)
        if (cancelled) return

        setMasters(result.data)

        if (result.data.length > 0) {
          setSelectedMasterId(result.data[0].id)
        }
      } catch (err) {
        if (cancelled) return
        const message = err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os BL Masters. Verifique se a API está rodando."
        setError(message)
      } finally {
        if (!cancelled) setLoadingList(false)
      }
    }

    void loadMasters()
    return () => { cancelled = true }
  }, [])

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
          : "Não foi possível carregar os detalhes do BL Master."
        setError(message)
        setSelectedMaster(null)
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    }

    void loadDetail()
    return () => { cancelled = true }
  }, [selectedMasterId])

  const relatedHouses = selectedMaster?.houses ?? []

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-info-100 bg-info-50 px-4 py-3 flex items-center gap-3">
        <Database className="h-5 w-5 text-info-600 shrink-0" />
        <p className="text-sm text-info-700">
          Consulta somente-leitura às entidades <span className="font-semibold">BL_Master</span> e <span className="font-semibold">BL_House</span> do banco local (SQL Server) — dados em tempo real via API.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 flex items-center gap-3 text-sm text-danger-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Ship className="h-4 w-4" /> BL_Master</CardTitle>
            <CardDescription>
              {loadingList ? "Carregando..." : `${masters.length} registros`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {loadingList && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            {!loadingList && masters.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <Box className="h-8 w-8" />
                <p className="text-sm">Nenhum BL Master encontrado</p>
              </div>
            )}

            {masters.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMasterId(m.id)}
                className={cn(
                  "w-full text-left rounded-lg border px-3 py-3 transition-colors",
                  selectedMasterId === m.id ? "border-primary-300 bg-primary-50" : "border-transparent hover:bg-secondary/60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-primary-900">{m.numeroBl}</span>
                  <StatusBadge status={m.status} className="text-[10px] px-1.5 py-0" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{m.navio} · {m.viagem}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          {!selectedMaster && !loadingDetail && (
            <CardContent className="py-16 text-center text-muted-foreground text-sm">
              Selecione um BL Master para ver os detalhes
            </CardContent>
          )}

          {(loadingDetail || selectedMaster) && (
            <>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  {loadingDetail ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Carregando detalhes...</span>
                    </div>
                  ) : selectedMaster ? (
                    <>
                      <CardTitle>{selectedMaster.numeroBl}</CardTitle>
                      <CardDescription>{selectedMaster.navio} · Viagem {selectedMaster.viagem}</CardDescription>
                    </>
                  ) : null}
                </div>
                {selectedMaster && <StatusBadge status={selectedMaster.status} />}
              </CardHeader>

              {selectedMaster && (
                <CardContent>
                  <Tabs defaultValue="dados">
                    <TabsList>
                      <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
                      <TabsTrigger value="containers">Containers ({selectedMaster.containers.length})</TabsTrigger>
                      <TabsTrigger value="houses">Houses ({relatedHouses.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dados">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <Field label="Porto Origem" value={selectedMaster.portoOrigem} />
                        <Field label="Porto Destino" value={selectedMaster.portoDestino} />
                        <Field label="Data Embarque" value={selectedMaster.dataEmbarque} />
                        <Field label="Chegada Prevista" value={selectedMaster.dataChegadaPrevista} />
                        <Field label="Embarcador" value={selectedMaster.embarcador} />
                        <Field label="Consignatário" value={selectedMaster.consignatario} />
                        <Field label="Agente de Carga" value={selectedMaster.agenteCarga} />
                        <Field label="Peso Bruto Total" value={selectedMaster.pesoBrutoTotal} />
                        <Field label="Volumes Total" value={String(selectedMaster.volumesTotal)} />
                      </div>
                      <div className="mt-4 rounded-lg bg-secondary/50 p-3">
                        <p className="text-[11px] text-muted-foreground">Arquivo de origem</p>
                        <p className="text-xs font-mono text-primary-800 mt-1">{selectedMaster.origemArquivo}</p>
                      </div>
                    </TabsContent>

                    <TabsContent value="containers">
                      <div className="space-y-2">
                        {selectedMaster.containers.map((c) => (
                          <div key={c.numero} className="flex items-center gap-3 rounded-lg border border-border p-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 shrink-0">
                              <ContainerIcon className="h-4 w-4" />
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 text-sm">
                              <span className="font-mono font-semibold text-primary-900">{c.numero}</span>
                              <span className="text-muted-foreground">{c.tipo}</span>
                              <span className="text-muted-foreground">Lacre: {c.lacre}</span>
                              <span className="text-muted-foreground">{c.pesoBruto} · {c.volumes} vol.</span>
                            </div>
                          </div>
                        ))}
                        {selectedMaster.containers.length === 0 && (
                          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum container registrado</p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="houses">
                      <div className="space-y-2">
                        {relatedHouses.map((h) => (
                          <div key={h.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                                <Package className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-primary-900">{h.numeroHbl}</p>
                                <p className="text-xs text-muted-foreground">{h.descricaoMercadoria}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <StatusBadge status={h.status} className="text-[10px]" />
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        ))}
                        {relatedHouses.length === 0 && (
                          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                            <Box className="h-8 w-8" />
                            <p className="text-sm">Nenhum House vinculado a este Master</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/50 p-3">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-primary-900 mt-0.5">{value}</p>
    </div>
  )
}

import { useState } from "react"
import { Database, Ship, Package, ChevronRight, Box, Container as ContainerIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { blMasterList, blHouseList } from "@/data/mockData"
import { cn } from "@/lib/utils"

export default function BLDatabase() {
  const [selectedMasterId, setSelectedMasterId] = useState(blMasterList[0].id)
  const selectedMaster = blMasterList.find((m) => m.id === selectedMasterId)!
  const relatedHouses = blHouseList.filter((h) => h.masterId === selectedMaster.id)

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-info-100 bg-info-50 px-4 py-3 flex items-center gap-3">
        <Database className="h-5 w-5 text-info-600 shrink-0" />
        <p className="text-sm text-info-700">
          Consulta somente-leitura às entidades <span className="font-semibold">BL_Master</span> e <span className="font-semibold">BL_House</span> do banco local (SQL Server) alimentado via OCR/n8n.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* Master list */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Ship className="h-4 w-4" /> BL_Master</CardTitle>
            <CardDescription>{blMasterList.length} registros</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {blMasterList.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMasterId(m.id)}
                className={cn(
                  "w-full text-left rounded-lg border px-3 py-3 transition-colors",
                  selectedMasterId === m.id ? "border-primary-300 bg-primary-50" : "border-transparent hover:bg-secondary/60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-primary-900">{m.numeroBL}</span>
                  <StatusBadge status={m.status} className="text-[10px] px-1.5 py-0" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{m.navio} · {m.viagem}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Detail */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>{selectedMaster.numeroBL}</CardTitle>
              <CardDescription>{selectedMaster.navio} · Viagem {selectedMaster.viagem}</CardDescription>
            </div>
            <StatusBadge status={selectedMaster.status} />
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="dados">
              <TabsList>
                <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
                <TabsTrigger value="containers">Containers</TabsTrigger>
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
                  <p className="text-[11px] text-muted-foreground">Arquivo de origem (OneDrive)</p>
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
                          <p className="font-semibold text-sm text-primary-900">{h.numeroHBL}</p>
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

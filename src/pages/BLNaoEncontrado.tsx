import { useCallback, useEffect, useState } from "react"
import {
  AlertOctagon, RefreshCcw, Link2, ExternalLink, XCircle, Calendar,
  ChevronRight, Clock, Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DocumentViewer } from "@/components/shared/DocumentViewer"
import { OperationalEmptyQueueCard } from "@/components/shared/OperationalEmptyQueueCard"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDateTime } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  fetchBlNaoEncontrado,
  reprocessarConsultaGlobalSys,
} from "@/lib/api/bl-nao-encontrado"
import { ApiError } from "@/lib/api/client"
import type { BlNaoEncontradoListItemDto } from "@/lib/api/types"

export default function BLNaoEncontrado() {
  const [items, setItems] = useState<BlNaoEncontradoListItemDto[]>([])
  const [selection, setSelection] = useState<{
    id: number
    tipo: "Master" | "House"
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [reprocessing, setReprocessing] = useState(false)
  const [assocOpen, setAssocOpen] = useState(false)

  const loadQueue = useCallback(async () => {
    setLoading(true)

    try {
      const result = await fetchBlNaoEncontrado()
      setItems(result.data)
      setSelection((prev) => {
        if (result.data.length === 0) {
          return null
        }

        if (
          prev &&
          result.data.some((item) => item.id === prev.id && item.tipo === prev.tipo)
        ) {
          return prev
        }

        return { id: result.data[0].id, tipo: result.data[0].tipo }
      })
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Erro ao carregar fila"
      toast.error(message)
      setItems([])
      setSelection(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  const selected = items.find(
    (item) => item.id === selection?.id && item.tipo === selection.tipo,
  )

  async function handleConsultarNovamente() {
    if (!selected) return

    setReprocessing(true)
    toast.loading("Consultando GlobalSys...", { id: "consulta" })

    try {
      const result = await reprocessarConsultaGlobalSys(selected.tipo, selected.id)

      if (result.found) {
        toast.success("BL localizado no GlobalSys.", { id: "consulta" })
      } else {
        toast.error("BL ainda não localizado no GlobalSys.", { id: "consulta" })
      }

      await loadQueue()
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Erro ao consultar GlobalSys"
      toast.error(message, { id: "consulta" })
    } finally {
      setReprocessing(false)
    }
  }

  function handleAssociar() {
    setAssocOpen(false)
    toast.info("Associação manual será implementada em etapa futura.")
  }

  function handleIgnorar() {
    toast.info("Ação de ignorar será implementada em etapa futura.")
  }

  function selectItem(item: BlNaoEncontradoListItemDto) {
    setSelection({ id: item.id, tipo: item.tipo })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Carregando fila...
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <OperationalEmptyQueueCard
        title="Nenhum BL pendente de localização no GlobalSys"
        description="Todos os documentos foram localizados no GlobalSys ou não aguardam ação manual."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-xl border border-danger-100 bg-danger-50 px-4 py-3">
        <AlertOctagon className="h-5 w-5 text-danger-600 shrink-0" />
        <p className="text-sm text-danger-700">
          <span className="font-semibold">{items.length} BLs</span> identificados pelo OCR não foram localizados no GlobalSys. Ação manual necessária.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-sm">Fila de Pendências</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-0">
              {items.map((bl) => (
                <button
                  key={`${bl.tipo}-${bl.id}`}
                  onClick={() => selectItem(bl)}
                  className={cn(
                    "w-full text-left rounded-lg border px-3 py-3 transition-colors",
                    selection?.id === bl.id && selection?.tipo === bl.tipo
                      ? "border-primary-300 bg-primary-50"
                      : "border-transparent hover:bg-secondary/60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-primary-900">{bl.numeroBl}</span>
                    <Badge variant="neutral" className="text-[10px]">{bl.tipo}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {formatDateTime(bl.data)}
                  </p>
                  <p className="text-[11px] text-danger-600 mt-1">{bl.tentativasConsulta}x tentativas de consulta</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {selected && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>{selected.numeroBl}</CardTitle>
                      <Badge variant="danger">Status Crítico</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      BL identificado pelo OCR, porém não localizado como registro correspondente no GlobalSys.
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <InfoField label="Número BL" value={selected.numeroBl} />
                    <InfoField label="Tipo" value={selected.tipo} />
                    <InfoField label="Data" value={formatDateTime(selected.data)} icon={Calendar} />
                    <InfoField label="Última tentativa" value={formatDateTime(selected.ultimaTentativa)} icon={Clock} />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button onClick={handleConsultarNovamente} disabled={reprocessing}>
                      {reprocessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="h-4 w-4" />
                      )}
                      Consultar novamente
                    </Button>
                    {/*<Button variant="accent" onClick={() => setAssocOpen(true)}>
                      <Link2 className="h-4 w-4" /> Associar manualmente
                    </Button> */}
                    <a
                      href="http://globalsyshomolog.fcalog.com.br/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="accent">
                        <ExternalLink className="h-4 w-4" /> Abrir GlobalSys
                      </Button>
                    </a>
                    {/* <Button variant="ghost" className="text-muted-foreground" onClick={handleIgnorar}>
                      <XCircle className="h-4 w-4" /> Ignorar
                    </Button> */}
                  </div>
                </CardContent>
              </Card>

              <DocumentViewer
                nome={selected.documento.nome}
                paginas={selected.documento.paginas}
                origemPath={selected.documento.origemPath}
                fileName={selected.documento.fileName}
              />
            </div>
          )}
        </div>

      <Dialog open={assocOpen} onOpenChange={setAssocOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Associar BL manualmente</DialogTitle>
            <DialogDescription>
              Vincule o BL identificado a um registro existente no GlobalSys informando o número correspondente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Número BL no OCR</Label>
              <Input value={selected?.numeroBl ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Número de referência no GlobalSys</Label>
              <Input placeholder="Ex: GS-2026-004521" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssocOpen(false)}>Cancelar</Button>
            <Button onClick={handleAssociar}>
              Confirmar Associação <ChevronRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoField({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div className="rounded-lg bg-secondary/50 p-3">
      <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </p>
      <p className="text-sm font-semibold text-primary-900 mt-0.5">{value}</p>
    </div>
  )
}

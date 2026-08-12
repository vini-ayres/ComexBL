import { Ship, Package, Boxes, Hash } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { BlFinalResponseDto } from '@/lib/api/types'
import { CardSkeleton } from '@/components/shared/LoadingSkeleton'
import { ApiStatePanel } from '@/components/shared/ApiStatePanel'

interface BlFinalViewProps {
  data: BlFinalResponseDto | null
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

function FieldRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null
  return (
    <div className="flex justify-between gap-4 text-sm py-1.5 border-b border-border/60 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-primary-900 text-right">{value}</span>
    </div>
  )
}

export function BlFinalView({ data, loading, error, onRetry }: BlFinalViewProps) {
  if (loading) {
    return <CardSkeleton />
  }

  if (error) {
    return (
      <ApiStatePanel
        variant="error"
        title="Erro ao carregar BL Final"
        description={error}
        onRetry={onRetry}
      />
    )
  }

  if (!data) {
    return (
      <ApiStatePanel
        variant="empty"
        title="BL Final não disponível"
        description="Informe o número do Master BL para visualizar os dados consolidados."
      />
    )
  }

  const { master, houses } = data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ship className="h-4 w-4 text-primary-600" />
          BL Final — {data.masterNumber}
          <Badge variant="outline" className="ml-auto">{data.blVersion}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="master">
          <TabsList>
            <TabsTrigger value="master"><Ship className="h-3.5 w-3.5 mr-1" /> Master</TabsTrigger>
            <TabsTrigger value="houses"><Package className="h-3.5 w-3.5 mr-1" /> Houses ({houses.length})</TabsTrigger>
            <TabsTrigger value="cargo"><Boxes className="h-3.5 w-3.5 mr-1" /> Cargo</TabsTrigger>
            <TabsTrigger value="ncm"><Hash className="h-3.5 w-3.5 mr-1" /> NCM</TabsTrigger>
          </TabsList>

          <TabsContent value="master" className="mt-4">
            <div className="rounded-lg border border-border p-4">
              <FieldRow label="Navio" value={master.vesselName} />
              <FieldRow label="Viagem" value={master.voyage} />
              <FieldRow label="Embarcador" value={master.shipperName} />
              <FieldRow label="Consignatário" value={master.consigneeName} />
              <FieldRow label="Porto origem" value={master.loadingPortName} />
              <FieldRow label="Porto destino" value={master.dischargePortName} />
              <FieldRow label="Container" value={master.containerNumber} />
              <FieldRow label="Peso bruto" value={master.grossWeight} />
              <FieldRow label="Volume" value={master.volumeMeasure} />
            </div>
          </TabsContent>

          <TabsContent value="houses" className="mt-4 space-y-3">
            {houses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum house vinculado.</p>
            ) : (
              houses.map((house) => (
                <div key={house.houseNumber} className="rounded-lg border border-border p-4">
                  <p className="font-semibold text-primary-900 mb-2">{house.houseNumber}</p>
                  <FieldRow label="Embarcador" value={house.shipperName} />
                  <FieldRow label="Consignatário" value={house.consigneeName} />
                  <FieldRow label="Mercadoria" value={house.itemName} />
                  <FieldRow label="Peso bruto" value={house.grossWeight} />
                  <FieldRow label="Volumes" value={house.packingQuantity} />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="cargo" className="mt-4 space-y-3">
            {houses.every((h) => h.cargos.length === 0) ? (
              <p className="text-sm text-muted-foreground">Nenhum cargo registrado.</p>
            ) : (
              houses.flatMap((house) =>
                house.cargos.map((cargo, index) => (
                  <div
                    key={`${house.houseNumber}-${index}`}
                    className="rounded-lg border border-border p-4"
                  >
                    <p className="text-xs text-muted-foreground mb-2">{house.houseNumber}</p>
                    <FieldRow label="Tipo" value={cargo.cargoType} />
                    <FieldRow label="Marca" value={cargo.brand} />
                    <FieldRow label="Embalagem" value={cargo.packaging} />
                    <FieldRow label="Classe perigo" value={cargo.hazardClass} />
                    <FieldRow label="UN" value={cargo.unNumber} />
                  </div>
                )),
              )
            )}
          </TabsContent>

          <TabsContent value="ncm" className="mt-4 space-y-3">
            {houses.every((h) => h.ncms.length === 0) ? (
              <p className="text-sm text-muted-foreground">Nenhum NCM registrado.</p>
            ) : (
              houses.map((house) => (
                <div key={house.houseNumber} className="rounded-lg border border-border p-4">
                  <p className="font-semibold text-primary-900 mb-2">{house.houseNumber}</p>
                  <div className="flex flex-wrap gap-2">
                    {house.ncms.map((ncm) => (
                      <Badge key={`${house.houseNumber}-${ncm}`} variant="neutral">{ncm}</Badge>
                    ))}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

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
  highlightHouseNumber?: string
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

export function BlFinalView({
  data,
  loading,
  error,
  highlightHouseNumber,
  onRetry,
}: BlFinalViewProps) {
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
        description="Não foi possível montar o BL Final consolidado deste documento."
      />
    )
  }

  const { master, houses } = data
  const focusedHouseNumber = highlightHouseNumber?.trim()
  const defaultTab = focusedHouseNumber ? "houses" : "master"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ship className="h-4 w-4 text-primary-600" />
          BL Final — {data.masterNumber}
          <Badge variant={data.blVersion === "FINAL" ? "success" : "outline"} className="ml-auto">
            {data.blVersion}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab}>
          <TabsList>
            <TabsTrigger value="master"><Ship className="h-3.5 w-3.5 mr-1" /> Master</TabsTrigger>
            <TabsTrigger value="houses"><Package className="h-3.5 w-3.5 mr-1" /> Houses ({houses.length})</TabsTrigger>
            <TabsTrigger value="cargo"><Boxes className="h-3.5 w-3.5 mr-1" /> Cargo</TabsTrigger>
            <TabsTrigger value="ncm"><Hash className="h-3.5 w-3.5 mr-1" /> NCM</TabsTrigger>
          </TabsList>

          <TabsContent value="master" className="mt-4">
            <div className="rounded-lg border border-border p-4">
              <FieldRow label="Master Number" value={master.masterNumber} />
              <FieldRow label="Vessel Name" value={master.vesselName} />
              <FieldRow label="Voyage" value={master.voyage} />
              <FieldRow label="Carrier SCAC" value={master.carrierScacCode} />
              <FieldRow label="Carrier Name" value={master.carrierName} />
              <FieldRow label="Freight Term" value={master.freightTerm} />
              <FieldRow label="Container Number" value={master.containerNumber} />
              <FieldRow label="Container Seal No 1" value={master.containerSealNo1} />
              <FieldRow label="Container Type" value={master.containerType} />
              <FieldRow label="Packing Quantity" value={master.packingQuantity} />
              <FieldRow label="Packing Quantity Unit" value={master.packingQuantityUnitCode} />
              <FieldRow label="Gross Weight" value={master.grossWeight} />
              <FieldRow label="Volume Measure" value={master.volumeMeasure} />
            </div>
          </TabsContent>

          <TabsContent value="houses" className="mt-4 space-y-3">
            {houses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum house vinculado.</p>
            ) : (
              houses.map((house) => (
                <div
                  key={house.houseNumber}
                  className={
                    focusedHouseNumber === house.houseNumber
                      ? "rounded-lg border border-primary-200 bg-primary-50/40 p-4"
                      : "rounded-lg border border-border p-4"
                  }
                >
                  <p className="font-semibold text-primary-900 mb-2">{house.houseNumber}</p>
                  <FieldRow label="Shipper Name" value={house.shipperName} />
                  <FieldRow label="Consignee Name" value={house.consigneeName} />
                  <FieldRow label="Notify Name" value={house.notifyName} />
                  <FieldRow label="Freight Term" value={house.freightTerm} />
                  <FieldRow label="Loading Port Name" value={house.loadingPortName} />
                  <FieldRow label="Discharge Port Name" value={house.dischargePortName} />
                  <FieldRow label="Delivery Port Name" value={house.deliveryPortName} />
                  <FieldRow label="Container Number" value={house.container.containerNumber} />
                  <FieldRow label="Packing Quantity" value={house.packingQuantity} />
                  <FieldRow label="Gross Weight" value={house.grossWeight} />
                  <FieldRow label="Volume Measure" value={house.volumeMeasure} />
                  <FieldRow label="Issue Date" value={house.issueDate} />
                  <FieldRow label="Item Name" value={house.itemName} />
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
                    <FieldRow label="Brand" value={cargo.brand} />
                    <FieldRow label="Counter Mark" value={cargo.counterMark} />
                    <FieldRow label="Cargo Type" value={cargo.cargoType} />
                    <FieldRow label="Hazard Class" value={cargo.hazardClass} />
                    <FieldRow label="UN Number" value={cargo.unNumber} />
                    <FieldRow label="Packaging" value={cargo.packaging} />
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

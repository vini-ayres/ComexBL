import { useState } from "react"
import {
  ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight,
  Download, Maximize2, FileText, Cloud,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DocumentViewerProps {
  nome: string
  paginas?: number
  origemPath?: string
  className?: string
}

export function DocumentViewer({ nome, paginas = 1, origemPath, className }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [page, setPage] = useState(1)

  return (
    <div className={cn("flex flex-col rounded-xl border border-border bg-white overflow-hidden shadow-card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-primary-50/50 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-100 text-primary-700">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-primary-900">{nome}</p>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Cloud className="h-3 w-3" /> OneDrive{origemPath ? ` · ${origemPath}` : ""}
            </p>
          </div>
        </div>
        <Badge variant="info" className="shrink-0">Original</Badge>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/40 px-3 py-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(40, z - 10))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-xs font-medium text-primary-800">{zoom}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(200, z + 10))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="mx-1 h-5 w-px bg-border" />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRotation((r) => (r + 90) % 360)}>
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium text-primary-800 tabular-nums">
            {page} / {paginas}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(paginas, p + 1))} disabled={page >= paginas}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="mx-1 h-5 w-px bg-border" />
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 min-h-[420px] overflow-auto bg-primary-950/95 p-6 flex items-center justify-center scrollbar-thin">
        <div
          className="flex aspect-[210/297] w-full max-w-md flex-col items-center justify-center gap-3 rounded-sm bg-white p-8 text-center shadow-2xl transition-transform duration-200"
          style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)` }}
        >
          <FileText className="h-14 w-14 text-primary-200" />
          <p className="text-xs font-semibold text-primary-800">Documento BL — Página {page}</p>
          <div className="w-full space-y-2 mt-2">
            <div className="h-2 w-full rounded bg-primary-100" />
            <div className="h-2 w-4/5 rounded bg-primary-100" />
            <div className="h-2 w-full rounded bg-primary-100" />
            <div className="h-2 w-3/5 rounded bg-primary-100" />
            <div className="h-2 w-full rounded bg-primary-100" />
          </div>
          <p className="mt-4 text-[10px] text-muted-foreground">
            Pré-visualização carregada via integração OneDrive
          </p>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from "react"
import {
  ChevronLeft, ChevronRight,
  Download, Maximize2, FileText, FolderOpen, Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { buildLocalFileUrl, fetchAuthenticatedFileObjectUrl } from "@/lib/api/files"
import type { BlVersion } from "@/lib/api/types"

interface DocumentViewerProps {
  nome: string
  paginas?: number
  origemPath?: string
  /** Nome do arquivo em /files — se informado, carrega preview local */
  fileName?: string | null
  /** Versão do BL (DRAFT ou FINAL). Substitui o badge "Original". */
  blVersion?: BlVersion | string | null
  className?: string
  compact?: boolean
}

function isPdf(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".pdf")
}

function isImage(fileName: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i.test(fileName)
}

function versionBadge(blVersion?: string | null) {
  const normalized = blVersion?.trim().toUpperCase()

  if (normalized === "DRAFT") {
    return { label: "DRAFT", variant: "warning" as const }
  }

  if (normalized === "FINAL") {
    return { label: "FINAL", variant: "success" as const }
  }

  return { label: "Original", variant: "info" as const }
}

export function DocumentViewer({
  nome,
  paginas = 1,
  origemPath,
  fileName,
  blVersion,
  className,
  compact = false,
}: DocumentViewerProps) {
  const [page, setPage] = useState(1)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(fileName))
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    setLoadError(null)
    setLoading(Boolean(fileName))
    setPage(1)
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return null
    })

    if (!fileName) {
      return
    }

    let objectUrl: string | null = null
    let cancelled = false

    void (async () => {
      try {
        objectUrl = await fetchAuthenticatedFileObjectUrl(buildLocalFileUrl(fileName))
        if (!cancelled) {
          setPreviewUrl(objectUrl)
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewUrl(null)
          setLoadError(error instanceof Error ? error.message : "Erro ao carregar arquivo.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [fileName])

  const previewKind = fileName
    ? isPdf(fileName)
      ? "pdf"
      : isImage(fileName)
        ? "image"
        : "other"
    : "none"

  const badge = versionBadge(blVersion)

  const handleDownload = () => {
    if (!previewUrl || !fileName) return
    const anchor = document.createElement("a")
    anchor.href = previewUrl
    anchor.download = fileName
    anchor.click()
  }

  const handleMaximize = () => {
    if (!previewUrl) return
    window.open(previewUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <div className={cn("flex flex-col rounded-xl border border-border bg-white overflow-hidden shadow-card", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border bg-primary-50/50 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-100 text-primary-700">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-primary-900">{nome}</p>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <FolderOpen className="h-3 w-3" />
              Arquivo local{origemPath ? ` · ${origemPath}` : ""}
            </p>
          </div>
        </div>
        <Badge variant={badge.variant} className="shrink-0">{badge.label}</Badge>
      </div>

      <div className="flex items-center justify-end gap-2 border-b border-border bg-secondary/40 px-3 py-2">
        <div className="flex items-center gap-1">
          {previewKind !== "pdf" && (
            <>
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
            </>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!previewUrl} onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!previewUrl} onClick={handleMaximize}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className={cn(
        "relative flex-1 overflow-auto bg-primary-950/95 p-4 flex items-center justify-center scrollbar-thin",
        compact ? "min-h-[360px]" : "min-h-[720px]",
      )}>
        {!fileName && (
          <div className="flex flex-col items-center gap-3 text-center text-white/80 px-6">
            <FileText className="h-14 w-14 text-white/30" />
            <p className="text-sm font-medium">Nenhum arquivo associado</p>
            <p className="text-xs text-white/50">
              O n8n deve gravar o binário em <code className="text-white/70">files/</code> e preencher a coluna FileName.
            </p>
          </div>
        )}

        {fileName && loadError && (
          <div className="flex flex-col items-center gap-3 text-center text-white/80 px-6">
            <FileText className="h-14 w-14 text-white/30" />
            <p className="text-sm font-medium">Não foi possível carregar o arquivo</p>
            <p className="text-xs text-white/50 break-all">{loadError}</p>
          </div>
        )}

        {previewUrl && !loadError && previewKind === "pdf" && (
          <>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white/70" />
              </div>
            )}
            <iframe
              title={nome}
              src={previewUrl}
              className={cn("w-full rounded-sm bg-white", compact ? "h-full min-h-[360px]" : "h-full min-h-[720px]")}
              onLoad={() => setLoading(false)}
            />
          </>
        )}

        {previewUrl && !loadError && previewKind === "image" && (
          <img
            src={previewUrl}
            alt={nome}
            className="max-h-full max-w-full object-contain shadow-2xl"
            onLoad={() => setLoading(false)}
          />
        )}

        {previewUrl && !loadError && previewKind === "other" && (
          <div className="flex flex-col items-center gap-3 text-center text-white/80 px-6">
            <FileText className="h-14 w-14 text-white/30" />
            <p className="text-sm font-medium">Pré-visualização não disponível para este tipo</p>
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" /> Baixar arquivo
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

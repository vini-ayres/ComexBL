import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { DivergenciaResolutionStrategy } from "@/lib/api/types"
import type { DivergenceDisplaySection } from "@/lib/divergencia/field-display"
import { resolveFieldLabel } from "@/lib/divergencia/field-display"
import { cn } from "@/lib/utils"

interface ResolveFieldHandler {
  (campoKey: string, strategy: DivergenciaResolutionStrategy): void
}

interface DivergenceTablesProps {
  onResolveField: ResolveFieldHandler
  resolvingKey: string | null
}

interface DivergenceSectionTablesProps extends DivergenceTablesProps {
  sections: DivergenceDisplaySection[]
}

interface DivergenceIndexedTablesProps extends DivergenceTablesProps {
  groups: DivergenceDisplaySection[]
}

function statusBadge(status: string) {
  if (status === "pendente") {
    return <Badge variant="warning">Pendente</Badge>
  }

  if (status === "igual") {
    return <Badge variant="success">Confere</Badge>
  }

  if (status === "resolvido_bl_final") {
    return <Badge variant="success">BL Final</Badge>
  }

  if (status === "resolvido_globalsys") {
    return <Badge variant="info">GlobalSys</Badge>
  }

  if (status === "resolvido_manual") {
    return <Badge variant="neutral">Manual</Badge>
  }

  return <Badge variant="neutral">{status}</Badge>
}

function DivergenceRowsTable({
  rows,
  onResolveField,
  resolvingKey,
}: {
  rows: DivergenceDisplaySection["rows"]
  onResolveField: ResolveFieldHandler
  resolvingKey: string | null
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Nenhum campo nesta seção.
      </p>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-primary-50/60 border-b border-border">
          <tr>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700">Campo</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700">BL Final</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700">GlobalSys</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-primary-700 w-28">Status</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-primary-700 w-44">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const isResolving = resolvingKey === row.campoKey

            return (
              <tr
                key={row.campoKey}
                className={cn("hover:bg-primary-50/30", row.pending && "bg-warning-50/40")}
              >
                <td className="px-3 py-2.5 font-medium text-primary-900">
                  {resolveFieldLabel(row.campoKey, row.campoLabel)}
                </td>
                <td className="px-3 py-2.5 text-primary-800">{row.valorBlFinal || "—"}</td>
                <td className="px-3 py-2.5 text-primary-800">{row.valorGlobalSys || "—"}</td>
                <td className="px-3 py-2.5">{statusBadge(row.status)}</td>
                <td className="px-3 py-2.5">
                  {row.pending ? (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={isResolving}
                        onClick={() => onResolveField(row.campoKey, "aceitar_bl_final")}
                      >
                        {isResolving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-success-600" />
                        )}
                        BL
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={isResolving}
                        onClick={() => onResolveField(row.campoKey, "aceitar_globalsys")}
                      >
                        {isResolving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-danger-600" />
                        )}
                        GS
                      </Button>
                    </div>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function DivergenceSectionTables({
  sections,
  onResolveField,
  resolvingKey,
}: DivergenceSectionTablesProps) {
  if (sections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Nenhum campo para comparar.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <div key={section.key} className="space-y-2">
          <h4 className="text-sm font-semibold text-primary-900">{section.label}</h4>
          <DivergenceRowsTable
            rows={section.rows}
            onResolveField={onResolveField}
            resolvingKey={resolvingKey}
          />
        </div>
      ))}
    </div>
  )
}

export function DivergenceIndexedTables({
  groups,
  onResolveField,
  resolvingKey,
}: DivergenceIndexedTablesProps) {
  return (
    <DivergenceSectionTables
      sections={groups}
      onResolveField={onResolveField}
      resolvingKey={resolvingKey}
    />
  )
}

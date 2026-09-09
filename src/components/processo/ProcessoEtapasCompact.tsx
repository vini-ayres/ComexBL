import { CheckCircle2, Circle, Clock, AlertTriangle, MinusCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ProcessoTimelineEtapaDto, ProcessoTimelineItemStatus } from '@/lib/api/types'
import { cn, formatDateTime } from '@/lib/utils'

function statusIcon(status: ProcessoTimelineItemStatus) {
  switch (status) {
    case 'concluido':
      return CheckCircle2
    case 'em_andamento':
      return Clock
    case 'erro':
      return AlertTriangle
    case 'nao_aplicavel':
      return MinusCircle
    default:
      return Circle
  }
}

function statusTone(status: ProcessoTimelineItemStatus): string {
  switch (status) {
    case 'concluido':
      return 'text-success-600 bg-success-50 border-success-100'
    case 'em_andamento':
      return 'text-warning-600 bg-warning-50 border-warning-100'
    case 'erro':
      return 'text-danger-600 bg-danger-50 border-danger-100'
    case 'nao_aplicavel':
      return 'text-muted-foreground bg-muted/40 border-border'
    default:
      return 'text-primary-600 bg-primary-50 border-primary-100'
  }
}

interface ProcessoEtapasCompactProps {
  etapas: ProcessoTimelineEtapaDto[]
}

export function ProcessoEtapasCompact({ etapas }: ProcessoEtapasCompactProps) {
  const sortedEtapas = [...etapas].sort((a, b) => a.ordem - b.ordem)

  if (sortedEtapas.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sortedEtapas.map((etapa) => {
        const Icon = statusIcon(etapa.status)
        return (
          <div
            key={`${etapa.ordem}-${etapa.titulo}`}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
              statusTone(etapa.status),
            )}
            title={
              [etapa.titulo, etapa.descricao, etapa.completedAt ? formatDateTime(etapa.completedAt) : null]
                .filter(Boolean)
                .join(' — ')
            }
          >
            <Icon className="h-3 w-3 shrink-0" />
            <span>{etapa.titulo}</span>
            {etapa.completedAt && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 ml-0.5 hidden sm:inline-flex">
                {formatDateTime(etapa.completedAt).split(' ')[1] ?? formatDateTime(etapa.completedAt)}
              </Badge>
            )}
          </div>
        )
      })}
    </div>
  )
}

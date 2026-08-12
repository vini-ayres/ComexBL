import { CheckCircle2, Circle, Clock, AlertTriangle, MinusCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ProcessoTimelineItemStatus, ProcessoTimelineResponseDto } from '@/lib/api/types'
import { cn, formatDateTime } from '@/lib/utils'
import { motion } from 'framer-motion'

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

function statusTone(status: ProcessoTimelineItemStatus) {
  switch (status) {
    case 'concluido':
      return 'bg-success text-white'
    case 'em_andamento':
      return 'bg-warning text-white'
    case 'erro':
      return 'bg-danger text-white'
    case 'nao_aplicavel':
      return 'bg-muted text-muted-foreground'
    default:
      return 'bg-primary-100 text-primary-500'
  }
}

function sourceLabel(source: 'persistido' | 'dinamico' | 'misto') {
  if (source === 'persistido') return 'Persistido'
  if (source === 'dinamico') return 'Dinâmico'
  return 'Misto'
}

interface ProcessoTimelineProps {
  data: ProcessoTimelineResponseDto
}

export function ProcessoTimeline({ data }: ProcessoTimelineProps) {
  const sortedEvents = [...data.events].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  )

  const sortedEtapas = [...data.etapas].sort((a, b) => a.ordem - b.ordem)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="neutral">Origem: {sourceLabel(data.source)}</Badge>
        {data.workflowStatus && (
          <Badge variant="outline">Workflow: {data.workflowStatus}</Badge>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-primary-900 mb-3">Etapas</h4>
        <div className="relative pl-8">
          <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-primary-100" />
          {sortedEtapas.map((etapa, index) => {
            const Icon = statusIcon(etapa.status)
            return (
              <motion.div
                key={`${etapa.ordem}-${etapa.titulo}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative pb-6 last:pb-0"
              >
                <div
                  className={cn(
                    'absolute -left-8 flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-white',
                    statusTone(etapa.status),
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="rounded-lg border border-border bg-white p-4 shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h5 className="font-semibold text-primary-900">{etapa.titulo}</h5>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {etapa.source === 'persistido' ? 'Persistido' : 'Dinâmico'}
                      </Badge>
                      {etapa.completedAt && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatDateTime(etapa.completedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  {etapa.descricao && (
                    <p className="text-sm text-muted-foreground mt-1">{etapa.descricao}</p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-primary-900 mb-3">Eventos</h4>
        {sortedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
        ) : (
          <div className="space-y-2">
            {sortedEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-border px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <p className="text-sm font-medium text-primary-900">{event.titulo}</p>
                  {event.descricao && (
                    <p className="text-xs text-muted-foreground mt-0.5">{event.descricao}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[10px]">
                    {event.source === 'persistido' ? 'Persistido' : 'Dinâmico'}
                  </Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDateTime(event.occurredAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

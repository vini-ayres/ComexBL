import { Badge } from '@/components/ui/badge'
import type { ProcessoTimelineEventDto, ProcessoTimelineItemStatus } from '@/lib/api/types'
import { cn, formatDateTime } from '@/lib/utils'

function statusVariant(status: ProcessoTimelineItemStatus): 'success' | 'warning' | 'danger' | 'neutral' | 'outline' {
  switch (status) {
    case 'concluido':
      return 'success'
    case 'em_andamento':
      return 'warning'
    case 'erro':
      return 'danger'
    case 'nao_aplicavel':
      return 'neutral'
    default:
      return 'outline'
  }
}

function statusLabel(status: ProcessoTimelineItemStatus): string {
  switch (status) {
    case 'concluido':
      return 'Concluído'
    case 'em_andamento':
      return 'Em andamento'
    case 'erro':
      return 'Erro'
    case 'nao_aplicavel':
      return 'N/A'
    default:
      return 'Pendente'
  }
}

interface ProcessoEventsTableProps {
  events: ProcessoTimelineEventDto[]
  className?: string
  maxHeight?: string
}

export function ProcessoEventsTable({
  events,
  className,
  maxHeight = 'max-h-64',
}: ProcessoEventsTableProps) {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  )

  if (sortedEvents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">Nenhum evento registrado.</p>
    )
  }

  return (
    <div className={cn('rounded-lg border border-border overflow-hidden', className)}>
      <div className={cn('overflow-auto', maxHeight)}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 border-b border-border bg-primary-50">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-primary-700 w-36">
                Data/Hora
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-primary-700">
                Evento
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-primary-700 hidden md:table-cell">
                Descrição
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-primary-700 w-24">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedEvents.map((event) => (
              <tr key={event.id} className="hover:bg-primary-50/30">
                <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                  {formatDateTime(event.occurredAt)}
                </td>
                <td className="px-3 py-2 font-medium text-primary-900">{event.titulo}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground hidden md:table-cell max-w-[320px] break-words">
                  {event.descricao ?? '—'}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={statusVariant(event.status)} className="text-[10px]">
                    {statusLabel(event.status)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

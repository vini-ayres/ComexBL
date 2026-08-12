import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface OperationalEmptyQueueCardProps {
  title: string
  description: string
  onRetry?: () => void
  retryLabel?: string
}

export function OperationalEmptyQueueCard({
  title,
  description,
  onRetry,
  retryLabel = 'Ir para o Dashboard',
}: OperationalEmptyQueueCardProps) {
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-12 text-center">
      <CheckCircle2 className="h-10 w-10 text-success-600 mx-auto mb-3" />
      <p className="text-sm font-medium text-primary-900">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

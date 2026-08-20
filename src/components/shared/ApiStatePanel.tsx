import { AlertCircle, Inbox, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ApiStatePanelProps {
  variant: 'error' | 'empty'
  title: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function ApiStatePanel({
  variant,
  title,
  description,
  onRetry,
  retryLabel = 'Tentar novamente',
  className,
}: ApiStatePanelProps) {
  const Icon = variant === 'error' ? AlertCircle : Inbox

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-6 flex flex-col items-center text-center gap-3',
        variant === 'error'
          ? 'border-danger-200 bg-danger-50/60'
          : 'border-border bg-muted/20',
        className,
      )}
    >
      <Icon
        className={cn(
          'h-8 w-8',
          variant === 'error' ? 'text-danger-600' : 'text-muted-foreground',
        )}
      />
      <div>
        <p className={cn('text-sm font-semibold', variant === 'error' ? 'text-danger-800' : 'text-primary-900')}>
          {title}
        </p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCcw className="h-3.5 w-3.5" />
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

import { GitBranch, Clock, User, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { WorkflowSummaryDto } from '@/lib/api/types'
import { formatDateTime } from '@/lib/utils'
import { CardSkeleton } from '@/components/shared/LoadingSkeleton'
import { ApiStatePanel } from '@/components/shared/ApiStatePanel'

interface WorkflowSummaryCardProps {
  workflow: WorkflowSummaryDto | null
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export function WorkflowSummaryCard({
  workflow,
  loading,
  error,
  onRetry,
}: WorkflowSummaryCardProps) {
  if (loading) {
    return <CardSkeleton />
  }

  if (error) {
    return (
      <ApiStatePanel
        variant="error"
        title="Erro ao carregar workflow"
        description={error}
        onRetry={onRetry}
      />
    )
  }

  if (!workflow) {
    return (
      <ApiStatePanel
        variant="empty"
        title="Workflow não encontrado"
        description="Nenhum registro de workflow foi localizado para este documento."
      />
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="h-4 w-4 text-primary-600" />
          Workflow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Status</span>
          <Badge variant="secondary">{workflow.status}</Badge>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
            <AlertCircle className="h-3.5 w-3.5" /> Pendência
          </span>
          <span className="text-right font-medium text-primary-900">
            {workflow.pendencia ?? 'Nenhuma pendência registrada'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Versão BL</span>
          <span className="font-medium">{workflow.blVersion}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" /> Responsável
          </span>
          <span className="font-medium">
            {workflow.responsavelUserId ? `Usuário #${workflow.responsavelUserId}` : 'Não atribuído'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Última atualização
          </span>
          <span className="font-medium tabular-nums">{formatDateTime(workflow.updatedAt)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

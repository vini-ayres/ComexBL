import { AlertTriangle, UserCog, Loader2, CheckCircle2, HelpCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { BLStatus } from "@/types"
import { cn } from "@/lib/utils"

const statusConfig: Record<BLStatus, { label: string; variant: "danger" | "warning" | "info" | "success" | "neutral"; icon: React.ElementType; dotColor: string }> = {
  divergencia: { label: "Divergência", variant: "danger", icon: AlertTriangle, dotColor: "bg-danger" },
  apoio_humano: { label: "Apoio Humano", variant: "warning", icon: UserCog, dotColor: "bg-warning" },
  processando: { label: "Processando", variant: "info", icon: Loader2, dotColor: "bg-info" },
  finalizado: { label: "Finalizado", variant: "success", icon: CheckCircle2, dotColor: "bg-success" },
  nao_encontrado: { label: "Não Encontrado", variant: "neutral", icon: HelpCircle, dotColor: "bg-gray-500" },
}

export function StatusBadge({ status, className }: { status: BLStatus; className?: string }) {
  const config = statusConfig[status]
  const Icon = config.icon
  return (
    <Badge variant={config.variant} className={cn("font-semibold", className)}>
      <Icon className={cn("h-3 w-3", status === "processando" && "animate-spin")} />
      {config.label}
    </Badge>
  )
}

export function StatusDot({ status }: { status: BLStatus }) {
  const config = statusConfig[status]
  return <span className={cn("h-2 w-2 rounded-full", config.dotColor, status === "processando" && "animate-pulse-dot")} />
}

export { statusConfig }

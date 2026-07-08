import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface KpiCardProps {
  label: string
  value: number | string
  delta?: number
  suffix?: string
  icon: LucideIcon
  tone?: "primary" | "danger" | "warning" | "info" | "success"
  index?: number
}

const toneStyles: Record<string, string> = {
  primary: "bg-primary-50 text-primary-700",
  danger: "bg-danger-50 text-danger-700",
  warning: "bg-warning-50 text-warning-700",
  info: "bg-info-50 text-info-700",
  success: "bg-success-50 text-success-700",
}

export function KpiCard({ label, value, delta, suffix, icon: Icon, tone = "primary", index = 0 }: KpiCardProps) {
  const isPositive = (delta ?? 0) >= 0
  // Para "Divergências"/"Apoio Humano" queda é boa; simplificamos com cor neutra por padrão
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
    >
      <Card className="hover:shadow-soft transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-bold text-primary-900 tabular-nums">
                {value}
                {suffix && <span className="ml-1 text-sm font-medium text-muted-foreground">{suffix}</span>}
              </p>
            </div>
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", toneStyles[tone])}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
          {delta !== undefined && (
            <div className="mt-3 flex items-center gap-1 text-xs font-medium">
              <span className={cn("flex items-center gap-0.5", isPositive ? "text-success-600" : "text-danger-600")}>
                {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {Math.abs(delta)}{suffix ?? ""}
              </span>
              <span className="text-muted-foreground">vs. ontem</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

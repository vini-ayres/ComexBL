import { CheckCircle2, Clock, User, FileCheck, AlertTriangle, Ship, Download, Printer } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { processoFinalizado } from "@/data/mockData"
import { formatDateTime } from "@/lib/utils"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export default function ProcessoFinalizado() {
  const p = processoFinalizado

  return (
    <div className="space-y-6">
      {/* Success banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-success-100 bg-gradient-to-br from-success-50 to-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-100 text-success-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary-900">Processo Finalizado com Sucesso</h2>
            <p className="text-sm text-muted-foreground">BL validado e arquivado no sistema local</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Exportar</Button>
          <Button variant="outline" size="sm"><Printer className="h-4 w-4" /> Imprimir</Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Summary */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SummaryRow icon={Ship} label="Número BL" value={p.numeroBL} />
            <SummaryRow icon={FileCheck} label="Tipo" value={p.tipo} />
            <SummaryRow icon={User} label="Usuário Responsável" value={p.usuario} />
            <SummaryRow icon={Clock} label="Tempo de Processamento" value={p.tempoProcessamento} />
            <SummaryRow icon={Clock} label="Finalizado em" value={formatDateTime(p.finalizadoEm)} />

            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Divergências
                </span>
                <Badge variant={p.divergenciasEncontradas === p.divergenciasResolvidas ? "success" : "warning"}>
                  {p.divergenciasResolvidas}/{p.divergenciasEncontradas} resolvidas
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Linha do Tempo do Processo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative pl-8">
              <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-primary-100" />
              {p.timeline.map((step, i) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="relative pb-8 last:pb-0"
                >
                  <div
                    className={cn(
                      "absolute -left-8 flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-white",
                      step.status === "concluido" ? "bg-success text-white" : "bg-primary-100 text-primary-500"
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="rounded-lg border border-border bg-white p-4 shadow-card">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-primary-900">{step.titulo}</h4>
                      {step.dataHora && (
                        <span className="text-xs text-muted-foreground tabular-nums">{formatDateTime(step.dataHora)}</span>
                      )}
                    </div>
                    {step.descricao && <p className="text-sm text-muted-foreground mt-1">{step.descricao}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SummaryRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="font-semibold text-primary-900">{value}</span>
    </div>
  )
}

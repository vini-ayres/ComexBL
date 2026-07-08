import { Database, CheckCircle2, Server, Activity, Table2, RefreshCcw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { dbConfigs } from "@/data/mockData"
import { formatDateTime } from "@/lib/utils"
import { toast } from "sonner"

export default function DatabaseConfigPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-info-100 bg-info-50 px-4 py-3 flex items-center gap-3">
        <Database className="h-5 w-5 text-info-600 shrink-0" />
        <p className="text-sm text-info-700">
          A aplicação integra dois bancos SQL Server: <span className="font-semibold">GlobalSys</span> (externo, consulta) e o <span className="font-semibold">banco local</span> (BL_Master / BL_House, alimentado pelo OCR via n8n).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dbConfigs.map((db, idx) => (
          <Card key={db.nome}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-4 w-4" /> {db.nome}
                </CardTitle>
                <CardDescription>{idx === 0 ? "SQL Server externo (somente leitura)" : "SQL Server da aplicação (ORM: Prisma)"}</CardDescription>
              </div>
              <Badge variant={db.status === "online" ? "success" : "danger"}>
                <CheckCircle2 className="h-3 w-3" /> {db.status === "online" ? "Online" : "Offline"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Host</Label>
                  <Input value={db.host} readOnly className="text-xs h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Database</Label>
                  <Input value={db.database} readOnly className="text-xs h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Usuário</Label>
                  <Input value={db.usuario} readOnly className="text-xs h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Latência</Label>
                  <div className="flex items-center gap-1.5 h-8">
                    <Activity className="h-3.5 w-3.5 text-success-600" />
                    <span className="text-sm font-medium text-success-700">{db.latenciaMs}ms</span>
                  </div>
                </div>
              </div>

              {db.tabelas && (
                <div>
                  <p className="text-xs font-semibold text-primary-700 mb-2 flex items-center gap-1">
                    <Table2 className="h-3.5 w-3.5" /> Tabelas Principais
                  </p>
                  <div className="space-y-1.5">
                    {db.tabelas.map((t) => (
                      <div key={t.nome} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-1.5 text-xs">
                        <span className="font-mono text-primary-800">{t.nome}</span>
                        <span className="text-muted-foreground">{t.registros.toLocaleString("pt-BR")} registros</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                <span>Verificado em {formatDateTime(db.ultimaVerificacao)}</span>
                <Button variant="ghost" size="sm" onClick={() => toast.success("Conexão verificada com sucesso.")}>
                  <RefreshCcw className="h-3.5 w-3.5" /> Verificar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Variáveis de Ambiente (.env)</CardTitle>
          <CardDescription>Configuração de conexão do GlobalSys — valores mascarados por segurança</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-primary-950 p-4 font-mono text-xs text-primary-100 overflow-x-auto">
            <p><span className="text-accent-400">GLOBALSYS_DB_HOST</span>=globalsys-sql01.empresa.local</p>
            <p><span className="text-accent-400">GLOBALSYS_DB_DATABASE</span>=GLOBALSYS_PROD</p>
            <p><span className="text-accent-400">GLOBALSYS_DB_USER</span>=svc_globalsys_ro</p>
            <p><span className="text-accent-400">GLOBALSYS_DB_PASSWORD</span>=••••••••••••••••</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

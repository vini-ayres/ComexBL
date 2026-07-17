import { useCallback, useEffect, useState } from "react"
import { Database, CheckCircle2, Server, Activity, Table2, RefreshCcw, Loader2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { dbConfigs } from "@/data/mockData"
import { fetchBlStats } from "@/lib/api/bl"
import { fetchHealth } from "@/lib/api/health"
import type { HealthResponse } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import { formatDateTime } from "@/lib/utils"
import { toast } from "sonner"

export default function DatabaseConfigPage() {
  const globalSysConfig = dbConfigs[0]
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [stats, setStats] = useState<{ masters: number; houses: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<string>(new Date().toISOString())

  const loadLocalDbStatus = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [healthData, statsData] = await Promise.all([
        fetchHealth(),
        fetchBlStats(),
      ])
      setHealth(healthData)
      setStats(statsData)
      setLastCheck(new Date().toISOString())
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : "Não foi possível verificar o banco local. A API está rodando?"
      setError(message)
      setHealth(null)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLocalDbStatus()
  }, [loadLocalDbStatus])

  const localOnline = health?.database.status === 'connected'

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-info-100 bg-info-50 px-4 py-3 flex items-center gap-3">
        <Database className="h-5 w-5 text-info-600 shrink-0" />
        <p className="text-sm text-info-700">
          A aplicação integra dois bancos SQL Server: <span className="font-semibold">GlobalSys</span> (externo, consulta) e o <span className="font-semibold">banco local</span> (BL_Master / BL_House, alimentado pelo OCR via n8n).
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 flex items-center gap-3 text-sm text-danger-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GlobalSys — ainda mock (sem API) */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-4 w-4" /> {globalSysConfig.nome}
              </CardTitle>
              <CardDescription>SQL Server externo (somente leitura) — mock</CardDescription>
            </div>
            <Badge variant={globalSysConfig.status === "online" ? "success" : "danger"}>
              <CheckCircle2 className="h-3 w-3" /> {globalSysConfig.status === "online" ? "Online" : "Offline"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Host</Label>
                <Input value={globalSysConfig.host} readOnly className="text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Database</Label>
                <Input value={globalSysConfig.database} readOnly className="text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Usuário</Label>
                <Input value={globalSysConfig.usuario} readOnly className="text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Latência</Label>
                <div className="flex items-center gap-1.5 h-8">
                  <Activity className="h-3.5 w-3.5 text-success-600" />
                  <span className="text-sm font-medium text-success-700">{globalSysConfig.latenciaMs}ms</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Banco local — API real */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-4 w-4" /> Banco Local (DB_OCR_FCA)
              </CardTitle>
              <CardDescription>SQL Server da aplicação (Prisma) — tempo real</CardDescription>
            </div>
            <Badge variant={localOnline ? "success" : "danger"}>
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {loading ? "Verificando..." : localOnline ? "Online" : "Offline"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Host</Label>
                <Input value={health?.database.server ?? "-"} readOnly className="text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Database</Label>
                <Input value={health?.database.database ?? "-"} readOnly className="text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Criptografia</Label>
                <Input
                  value={health ? (health.database.encrypt ? "Ativa" : "Desativada") : "-"}
                  readOnly
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Latência</Label>
                <div className="flex items-center gap-1.5 h-8">
                  <Activity className={`h-3.5 w-3.5 ${localOnline ? "text-success-600" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${localOnline ? "text-success-700" : "text-muted-foreground"}`}>
                    {health?.database.responseTimeMs != null ? `${health.database.responseTimeMs}ms` : "-"}
                  </span>
                </div>
              </div>
            </div>

            {stats && (
              <div>
                <p className="text-xs font-semibold text-primary-700 mb-2 flex items-center gap-1">
                  <Table2 className="h-3.5 w-3.5" /> Tabelas Principais
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-1.5 text-xs">
                    <span className="font-mono text-primary-800">BL_Master</span>
                    <span className="text-muted-foreground">{stats.masters.toLocaleString("pt-BR")} registros</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-1.5 text-xs">
                    <span className="font-mono text-primary-800">BL_House</span>
                    <span className="text-muted-foreground">{stats.houses.toLocaleString("pt-BR")} registros</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
              <span>Verificado em {formatDateTime(lastCheck)}</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={loading}
                onClick={() => {
                  void loadLocalDbStatus().then(() => toast.success("Verificação concluída."))
                }}
              >
                <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Verificar
              </Button>
            </div>
          </CardContent>
        </Card>
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

import { useEffect, useState, type Dispatch, type SetStateAction } from "react"
import { Database, CheckCircle2, Server, Activity, Table2, RefreshCcw, Loader2, AlertCircle, Save } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  fetchGlobalSysConfig,
  fetchLocalDbConfig,
  saveGlobalSysConfig,
  saveLocalDbConfig,
  testGlobalSysConfig,
  testLocalDbConfig,
  type GlobalSysConfigDto,
  type GlobalSysConfigPayload,
  type LocalDbConfigDto,
} from "@/lib/api/integrations"
import { ApiError } from "@/lib/api/client"
import { formatDateTime } from "@/lib/utils"
import { toast } from "sonner"

const emptyForm = {
  server: "",
  port: 1433,
  database: "",
  domain: "",
  authMode: "auto",
  user: "",
  encrypt: false,
  trustServerCertificate: true,
}

type SqlForm = typeof emptyForm

function toForm(data: GlobalSysConfigDto): SqlForm {
  return {
    server: data.server,
    port: data.port,
    database: data.database,
    domain: data.domain,
    authMode: data.authMode || "auto",
    user: data.user,
    encrypt: data.encrypt,
    trustServerCertificate: data.trustServerCertificate,
  }
}

function toPayload(form: SqlForm, password: string): GlobalSysConfigPayload {
  return {
    ...form,
    authMode: form.authMode === "auto" ? "" : form.authMode,
    ...(password.trim() ? { password: password.trim() } : {}),
  }
}

export default function DatabaseConfigPage() {
  const [gsConfig, setGsConfig] = useState<GlobalSysConfigDto | null>(null)
  const [gsForm, setGsForm] = useState<SqlForm>(emptyForm)
  const [gsPassword, setGsPassword] = useState("")
  const [loadingGs, setLoadingGs] = useState(true)
  const [savingGs, setSavingGs] = useState(false)
  const [testingGs, setTestingGs] = useState(false)
  const [gsError, setGsError] = useState<string | null>(null)

  const [localConfig, setLocalConfig] = useState<LocalDbConfigDto | null>(null)
  const [localForm, setLocalForm] = useState<SqlForm>(emptyForm)
  const [localPassword, setLocalPassword] = useState("")
  const [loadingLocal, setLoadingLocal] = useState(true)
  const [savingLocal, setSavingLocal] = useState(false)
  const [testingLocal, setTestingLocal] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  async function loadGlobalSys() {
    setLoadingGs(true)
    setGsError(null)
    try {
      const data = await fetchGlobalSysConfig()
      setGsConfig(data)
      setGsForm(toForm(data))
      setGsPassword("")
    } catch (err) {
      setGsError(err instanceof ApiError ? err.message : "Erro ao carregar a configuração do GlobalSys.")
    } finally {
      setLoadingGs(false)
    }
  }

  async function loadLocalDb() {
    setLoadingLocal(true)
    setLocalError(null)
    try {
      const data = await fetchLocalDbConfig()
      setLocalConfig(data)
      setLocalForm(toForm(data))
      setLocalPassword("")
    } catch (err) {
      setLocalError(err instanceof ApiError ? err.message : "Erro ao carregar a configuração do banco local.")
    } finally {
      setLoadingLocal(false)
    }
  }

  useEffect(() => {
    void loadGlobalSys()
    void loadLocalDb()
  }, [])

  async function handleSaveGlobalSys() {
    setSavingGs(true)
    try {
      const saved = await saveGlobalSysConfig(toPayload(gsForm, gsPassword))
      setGsConfig(saved)
      setGsForm(toForm(saved))
      setGsPassword("")
      toast.success("Configuração do GlobalSys salva. Ela passa a valer imediatamente, sem editar o .env.")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao salvar a configuração do GlobalSys.")
    } finally {
      setSavingGs(false)
    }
  }

  async function handleTestGlobalSys() {
    setTestingGs(true)
    toast.loading("Testando conexão com o GlobalSys...", { id: "gs-test" })
    try {
      const result = await testGlobalSysConfig(toPayload(gsForm, gsPassword))
      if (result.connected) {
        toast.success(`${result.message} (${result.responseTimeMs}ms)`, { id: "gs-test" })
      } else {
        toast.error(result.message, { id: "gs-test" })
      }
      await loadGlobalSys()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao testar o GlobalSys.", { id: "gs-test" })
    } finally {
      setTestingGs(false)
    }
  }

  async function handleSaveLocalDb() {
    setSavingLocal(true)
    try {
      const saved = await saveLocalDbConfig(toPayload(localForm, localPassword))
      setLocalConfig(saved)
      setLocalForm(toForm(saved))
      setLocalPassword("")
      toast.success("Configuração do banco local salva. A API reconecta com os novos dados, sem editar o .env.")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao salvar a configuração do banco local.")
    } finally {
      setSavingLocal(false)
    }
  }

  async function handleTestLocalDb() {
    setTestingLocal(true)
    toast.loading("Testando conexão com o banco local...", { id: "local-db-test" })
    try {
      const result = await testLocalDbConfig(toPayload(localForm, localPassword))
      if (result.connected) {
        toast.success(`${result.message} (${result.responseTimeMs}ms)`, { id: "local-db-test" })
      } else {
        toast.error(result.message, { id: "local-db-test" })
      }
      await loadLocalDb()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao testar o banco local.", { id: "local-db-test" })
    } finally {
      setTestingLocal(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-info-100 bg-info-50 px-4 py-3 flex items-center gap-3">
        <Database className="h-5 w-5 text-info-600 shrink-0" />
        <p className="text-sm text-info-700">
          A aplicação integra dois bancos SQL Server: <span className="font-semibold">GlobalSys</span> (externo, consulta) e o <span className="font-semibold">banco local</span> (BL_Master / BL_House). Ambos podem ser editados nesta tela; o .env continua como fallback até o primeiro save.
        </p>
      </div>

      {(gsError || localError) && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 flex items-center gap-3 text-sm text-danger-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {gsError || localError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SqlServerConfigCard
          title="GlobalSys (SQL Server externo)"
          loadingLabel="Carregando GlobalSys..."
          config={gsConfig}
          form={gsForm}
          setForm={setGsForm}
          password={gsPassword}
          setPassword={setGsPassword}
          loading={loadingGs}
          saving={savingGs}
          testing={testingGs}
          onSave={() => void handleSaveGlobalSys()}
          onTest={() => void handleTestGlobalSys()}
        />

        <SqlServerConfigCard
          title="Banco Local (SQL Server da aplicação)"
          loadingLabel="Carregando banco local..."
          config={localConfig}
          form={localForm}
          setForm={setLocalForm}
          password={localPassword}
          setPassword={setLocalPassword}
          loading={loadingLocal}
          saving={savingLocal}
          testing={testingLocal}
          onSave={() => void handleSaveLocalDb()}
          onTest={() => void handleTestLocalDb()}
        >
          {localConfig && (
            <div>
              <p className="text-xs font-semibold text-primary-700 mb-2 flex items-center gap-1">
                <Table2 className="h-3.5 w-3.5" /> Tabelas principais
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-1.5 text-xs">
                  <span className="font-mono text-primary-800">BL_Master</span>
                  <span className="text-muted-foreground">{localConfig.masters.toLocaleString("pt-BR")} registros</span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-1.5 text-xs">
                  <span className="font-mono text-primary-800">BL_House</span>
                  <span className="text-muted-foreground">{localConfig.houses.toLocaleString("pt-BR")} registros</span>
                </div>
              </div>
            </div>
          )}
        </SqlServerConfigCard>
      </div>
    </div>
  )
}

function SqlServerConfigCard({
  title,
  loadingLabel,
  config,
  form,
  setForm,
  password,
  setPassword,
  loading,
  saving,
  testing,
  onSave,
  onTest,
  children,
}: {
  title: string
  loadingLabel: string
  config: GlobalSysConfigDto | null
  form: SqlForm
  setForm: Dispatch<SetStateAction<SqlForm>>
  password: string
  setPassword: (value: string) => void
  loading: boolean
  saving: boolean
  testing: boolean
  onSave: () => void
  onTest: () => void
  children?: React.ReactNode
}) {
  const online = config?.status === "conectado"
  const busy = loading || saving || testing

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-4 w-4" /> {title}
          </CardTitle>
          <CardDescription>
            {config?.source === "database"
              ? "Configuração persistida nesta tela (sobrescreve o .env)"
              : "Valores atuais vêm do .env até você salvar nesta tela"}
          </CardDescription>
        </div>
        <Badge variant={online ? "success" : config?.status === "erro" ? "danger" : "neutral"}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
          {loading ? "Carregando..." : online ? "Online" : config?.status === "erro" ? "Erro" : "Offline"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !config ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> {loadingLabel}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Servidor</Label>
                <Input
                  value={form.server}
                  placeholder="10.100.16.5"
                  className="text-xs h-8"
                  onChange={(e) => setForm({ ...form, server: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Porta</Label>
                <Input
                  type="number"
                  value={form.port}
                  className="text-xs h-8"
                  onChange={(e) => setForm({ ...form, port: Number(e.target.value) || 1433 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Database</Label>
                <Input
                  value={form.database}
                  className="text-xs h-8"
                  onChange={(e) => setForm({ ...form, database: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Domínio</Label>
                <Input
                  value={form.domain}
                  placeholder="abainfra.local"
                  className="text-xs h-8"
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Autenticação</Label>
                <Select value={form.authMode} onValueChange={(value) => setForm({ ...form, authMode: value })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automático</SelectItem>
                    <SelectItem value="ntlm">NTLM (domínio Windows)</SelectItem>
                    <SelectItem value="sql">SQL Server</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Usuário</Label>
                <Input
                  value={form.user}
                  className="text-xs h-8"
                  onChange={(e) => setForm({ ...form, user: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Senha</Label>
                <Input
                  type="password"
                  value={password}
                  className="text-xs h-8"
                  placeholder={config?.passwordSet ? "•••••••• (preencha para alterar)" : "Senha"}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Latência</Label>
                <div className="flex items-center gap-1.5 h-8">
                  <Activity className={`h-3.5 w-3.5 ${online ? "text-success-600" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${online ? "text-success-700" : "text-muted-foreground"}`}>
                    {config?.latencyMs != null ? `${config.latencyMs}ms` : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Criptografia (encrypt)</p>
              <Switch checked={form.encrypt} onCheckedChange={(v) => setForm({ ...form, encrypt: v })} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Confiar no certificado do servidor</p>
              <Switch
                checked={form.trustServerCertificate}
                onCheckedChange={(v) => setForm({ ...form, trustServerCertificate: v })}
              />
            </div>

            {config?.lastError && config.status !== "conectado" && (
              <p className="text-xs text-danger-700 break-words">{config.lastError}</p>
            )}

            {children}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">
                {config?.lastCheckAt ? `Verificado em ${formatDateTime(config.lastCheckAt)}` : "Ainda não testado"}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={busy} onClick={onTest}>
                  <RefreshCcw className={`h-3.5 w-3.5 ${testing ? "animate-spin" : ""}`} /> Testar
                </Button>
                <Button size="sm" disabled={busy} onClick={onSave}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Salvar
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

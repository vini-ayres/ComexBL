import { useEffect, useState } from "react"
import {
  Network, CheckCircle2, RefreshCcw, Save, Users, Server,
  ShieldCheck, Wifi, Lock, Loader2, AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  fetchLdapConfig,
  saveLdapConfig,
  syncLdapUsers,
  testLdapConfig,
  type LdapConfigDto,
} from "@/lib/api/integrations"
import { ApiError } from "@/lib/api/client"
import { formatDateTime } from "@/lib/utils"
import { toast } from "sonner"

const emptyForm = {
  servidor: "",
  porta: 389,
  baseDN: "",
  grupoAD: "GG_OCR_BL_",
  bindUser: "",
  usarSSL: false,
}

export default function LdapConfigPage() {
  const [config, setConfig] = useState<LdapConfigDto | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadConfig() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchLdapConfig()
      applyConfig(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar a configuração LDAP.")
    } finally {
      setLoading(false)
    }
  }

  function applyConfig(data: LdapConfigDto) {
    setConfig(data)
    setForm({
      servidor: data.servidor,
      porta: data.porta,
      baseDN: data.baseDN,
      grupoAD: data.grupoAD,
      bindUser: data.bindUser,
      usarSSL: data.usarSSL,
    })
    setPassword("")
  }

  useEffect(() => {
    void loadConfig()
  }, [])

  function payload() {
    return {
      ...form,
      ...(password.trim() ? { password: password.trim() } : {}),
    }
  }

  async function handleTest() {
    setTesting(true)
    toast.loading("Testando conexão com o servidor LDAP...", { id: "ldap-test" })
    try {
      const result = await testLdapConfig(payload())
      if (result.connected) {
        toast.success(`${result.message} (${result.responseTimeMs}ms)`, { id: "ldap-test" })
      } else {
        toast.error(result.message, { id: "ldap-test" })
      }
      await loadConfig()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao testar o LDAP.", { id: "ldap-test" })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const saved = await saveLdapConfig(payload())
      applyConfig(saved)
      toast.success("Configurações LDAP salvas. Elas passam a valer imediatamente, sem editar o .env.")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao salvar a configuração LDAP.")
    } finally {
      setSaving(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    toast.loading("Sincronizando usuários e grupos do AD...", { id: "ldap-sync" })
    try {
      const result = await syncLdapUsers()
      toast.success(
        `${result.totalActiveUsers} usuário(s) ativos (${result.usersCreated} novos, ${result.usersUpdated} atualizados).`,
        { id: "ldap-sync" },
      )
      await loadConfig()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha na sincronização.", { id: "ldap-sync" })
    } finally {
      setSyncing(false)
    }
  }

  const connected = config?.status === "conectado"
  const busy = loading || saving || testing || syncing

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 flex items-start gap-3 text-sm text-danger-700">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2"><Network className="h-4 w-4" /> Configuração LDAP / Active Directory</CardTitle>
              <CardDescription>
                Parâmetros de conexão para autenticação e sincronismo de usuários.
                {config?.source === "env"
                  ? " Valores atuais vêm do .env até você salvar nesta tela."
                  : " Valores persistidos nesta tela (sobrescrevem o .env)."}
              </CardDescription>
            </div>
            <Badge variant={connected ? "success" : config?.status === "erro" ? "danger" : "neutral"}>
              <Wifi className="h-3 w-3" /> {connected ? "Conectado" : config?.status === "erro" ? "Erro" : "Desconectado"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && !config ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando configuração LDAP...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Servidor LDAP</Label>
                    <Input
                      value={form.servidor}
                      placeholder="10.100.21.11"
                      onChange={(e) => setForm({ ...form, servidor: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Porta</Label>
                    <Input
                      type="number"
                      value={form.porta}
                      onChange={(e) => setForm({ ...form, porta: Number(e.target.value) || 389 })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Base DN</Label>
                    <Input
                      value={form.baseDN}
                      placeholder="DC=fcalog,DC=local"
                      onChange={(e) => setForm({ ...form, baseDN: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Filtro de Grupo AD (sincronismo)</Label>
                    <Input
                      value={form.grupoAD}
                      placeholder="GG_OCR_BL_"
                      onChange={(e) => setForm({ ...form, grupoAD: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Usuário de Bind (Service Account)</Label>
                    <Input
                      value={form.bindUser}
                      placeholder="CN=Service Account,OU=Serviços,DC=dominio,DC=local"
                      onChange={(e) => setForm({ ...form, bindUser: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Senha</Label>
                    <Input
                      type="password"
                      value={password}
                      placeholder={config?.passwordSet ? "•••••••••• (preencha para alterar)" : "Senha da conta de serviço"}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-primary-900">Usar conexão segura (LDAPS/SSL)</p>
                      <p className="text-xs text-muted-foreground">Recomendado para ambientes de produção</p>
                    </div>
                  </div>
                  <Switch checked={form.usarSSL} onCheckedChange={(v) => setForm({ ...form, usarSSL: v })} />
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={() => void handleSave()} disabled={busy}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar Configuração
                  </Button>
                  <Button variant="outline" onClick={() => void handleTest()} disabled={busy}>
                    <RefreshCcw className={testing ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Testar Conexão
                  </Button>
                  <Button variant="accent" onClick={() => void handleSync()} disabled={busy}>
                    {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                    Sincronizar Agora
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Server className="h-4 w-4" /> Status da Conexão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatusRow label="Status" value={
              <Badge variant={connected ? "success" : config?.status === "erro" ? "danger" : "neutral"}>
                {connected ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {connected ? "Conectado" : config?.status === "erro" ? "Erro" : "Desconectado"}
              </Badge>
            } />
            <StatusRow
              label="Origem"
              value={config?.source === "database" ? "Tela (banco)" : ".env"}
            />
            <StatusRow
              label="Última sincronização"
              value={config?.ultimaSincronizacao ? formatDateTime(config.ultimaSincronizacao) : "Nunca"}
            />
            <StatusRow label="Usuários sincronizados" value={String(config?.usuariosSincronizados ?? 0)} />
            <StatusRow label="Grupos mapeados" value={String(config?.gruposMapeados ?? 0)} />
            <div className="rounded-lg bg-primary-50 p-3 flex items-start gap-2 mt-2">
              <ShieldCheck className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-primary-700">
                Novos usuários são criados automaticamente na primeira autenticação bem-sucedida, herdando o perfil do grupo AD correspondente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Grupos AD Monitorados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !config ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando grupos AD...
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-primary-50/60 border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-primary-700">Grupo</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-primary-700">Distinguished Name</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-primary-700">Perfil</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-primary-700">Usuários</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(config?.grupos ?? []).map((g) => (
                    <tr key={g.id}>
                      <td className="px-4 py-2.5 font-medium text-primary-900">{g.nomeGrupo}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{g.dn}</td>
                      <td className="px-4 py-2.5"><Badge variant="outline">{g.perfilMapeado}</Badge></td>
                      <td className="px-4 py-2.5">{g.usuarios}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-primary-900 text-right">{value}</span>
    </div>
  )
}

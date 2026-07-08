import { useState } from "react"
import {
  Network, CheckCircle2, RefreshCcw, Save, Users, Server,
  ShieldCheck, Wifi, Lock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { ldapConfig, gruposAD, usuarios } from "@/data/mockData"
import { formatDateTime } from "@/lib/utils"
import { toast } from "sonner"

export default function LdapConfigPage() {
  const [config, setConfig] = useState(ldapConfig)
  const [testing, setTesting] = useState(false)

  function handleTest() {
    setTesting(true)
    toast.loading("Testando conexão com o servidor LDAP...", { id: "ldap-test" })
    setTimeout(() => {
      setTesting(false)
      toast.success("Conexão estabelecida com sucesso.", { id: "ldap-test" })
    }, 1200)
  }

  function handleSave() {
    toast.success("Configurações LDAP salvas com sucesso.")
  }

  function handleSync() {
    toast.loading("Sincronizando usuários e grupos do AD...", { id: "ldap-sync" })
    setTimeout(() => toast.success(`${usuarios.length} usuários sincronizados.`, { id: "ldap-sync" }), 1500)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config form */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2"><Network className="h-4 w-4" /> Configuração LDAP / Active Directory</CardTitle>
              <CardDescription>Parâmetros de conexão para autenticação e sincronismo de usuários</CardDescription>
            </div>
            <Badge variant={config.status === "conectado" ? "success" : "danger"}>
              <Wifi className="h-3 w-3" /> {config.status === "conectado" ? "Conectado" : "Desconectado"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Servidor LDAP</Label>
                <Input value={config.servidor} onChange={(e) => setConfig({ ...config, servidor: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Porta</Label>
                <Input type="number" value={config.porta} onChange={(e) => setConfig({ ...config, porta: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Base DN</Label>
                <Input value={config.baseDN} onChange={(e) => setConfig({ ...config, baseDN: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Filtro de Grupo AD (sincronismo)</Label>
                <Input value={config.grupoAD} onChange={(e) => setConfig({ ...config, grupoAD: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Usuário de Bind (Service Account)</Label>
                <Input value={config.bindUser} onChange={(e) => setConfig({ ...config, bindUser: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Senha</Label>
                <Input type="password" placeholder="••••••••••" />
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
              <Switch checked={config.usarSSL} onCheckedChange={(v) => setConfig({ ...config, usarSSL: v })} />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={handleSave}><Save className="h-4 w-4" /> Salvar Configuração</Button>
              <Button variant="outline" onClick={handleTest} disabled={testing}>
                <RefreshCcw className={testing ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Testar Conexão
              </Button>
              <Button variant="accent" onClick={handleSync}><Users className="h-4 w-4" /> Sincronizar Agora</Button>
            </div>
          </CardContent>
        </Card>

        {/* Status card */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Server className="h-4 w-4" /> Status da Conexão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatusRow label="Status" value={
              <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> Conectado</Badge>
            } />
            <StatusRow label="Última sincronização" value={formatDateTime(config.ultimaSincronizacao)} />
            <StatusRow label="Usuários sincronizados" value={String(usuarios.length)} />
            <StatusRow label="Grupos mapeados" value={String(gruposAD.length)} />
            <div className="rounded-lg bg-primary-50 p-3 flex items-start gap-2 mt-2">
              <ShieldCheck className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-primary-700">
                Novos usuários são criados automaticamente na primeira autenticação bem-sucedida, herdando o perfil do grupo AD correspondente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grupos AD */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Grupos AD Monitorados</CardTitle>
        </CardHeader>
        <CardContent>
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
                {gruposAD.map((g) => (
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
        </CardContent>
      </Card>
    </div>
  )
}

function StatusRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-primary-900">{value}</span>
    </div>
  )
}

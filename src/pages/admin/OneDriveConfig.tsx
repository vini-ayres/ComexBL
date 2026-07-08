import { useState } from "react"
import { Cloud, CheckCircle2, RefreshCcw, Save, FolderOpen, FileText, Key } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { oneDriveConfig } from "@/data/mockData"
import { formatDateTime } from "@/lib/utils"
import { toast } from "sonner"

export default function OneDriveConfigPage() {
  const [config] = useState(oneDriveConfig)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2"><Cloud className="h-4 w-4" /> Integração Microsoft OneDrive</CardTitle>
              <CardDescription>Acesso aos documentos originais de BL para preview nas telas operacionais</CardDescription>
            </div>
            <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> Conectado</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tenant ID (Azure AD)</Label>
                <Input value={config.tenantId} readOnly />
              </div>
              <div className="space-y-1.5">
                <Label>Client ID (App Registration)</Label>
                <Input value={config.clientId} readOnly />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Client Secret</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" value="••••••••••••••••••••••" className="pl-9" readOnly />
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Pasta Raiz de Documentos</Label>
                <div className="relative">
                  <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={config.pastaRaiz} className="pl-9" readOnly />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={() => toast.success("Configurações salvas.")}><Save className="h-4 w-4" /> Salvar</Button>
              <Button variant="outline" onClick={() => toast.success("Conexão com Microsoft Graph validada.")}>
                <RefreshCcw className="h-4 w-4" /> Testar Conexão
              </Button>
            </div>

            <div className="rounded-lg bg-info-50 border border-info-100 p-3 text-xs text-info-700 mt-2">
              A autenticação utiliza <span className="font-semibold">Microsoft Graph API</span> via OAuth2 (client credentials flow).
              As credenciais reais são configuradas via variáveis de ambiente seguras no backend/n8n.
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm">Status da Integração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatusRow label="Status" value={<Badge variant="success"><CheckCircle2 className="h-3 w-3" /> Online</Badge>} />
            <StatusRow label="Última sincronização" value={formatDateTime(config.ultimaSincronizacao)} />
            <StatusRow label="Arquivos indexados" value={config.arquivosIndexados.toLocaleString("pt-BR")} />
            <div className="rounded-lg bg-primary-50 p-3 flex items-start gap-2 mt-2">
              <FileText className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-primary-700">
                Suporte a preview de PDF e imagem, com zoom, rotação e navegação de páginas nas telas de
                BL Não Encontrado, Apoio Humano e Divergências.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
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

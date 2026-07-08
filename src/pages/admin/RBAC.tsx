import { ShieldCheck, Users, Check, X, Network } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { permissoesPorPerfil, permissoesDisponiveis, gruposAD, usuarios } from "@/data/mockData"
import type { PerfilUsuario } from "@/types"
import { cn } from "@/lib/utils"

const perfis: PerfilUsuario[] = ["Administrador", "Supervisor", "Operador", "Auditor"]

const perfilColors: Record<PerfilUsuario, string> = {
  Administrador: "bg-danger-50 text-danger-700 border-danger-100",
  Supervisor: "bg-info-50 text-info-700 border-info-100",
  Operador: "bg-success-50 text-success-700 border-success-100",
  Auditor: "bg-warning-50 text-warning-700 border-warning-100",
}

export default function RBAC() {
  return (
    <div className="space-y-6">
      {/* Perfis cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {perfis.map((perfil) => {
          const count = usuarios.filter((u) => u.perfil === perfil).length
          return (
            <Card key={perfil}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Badge className={cn("border", perfilColors[perfil])}>{perfil}</Badge>
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-primary-900">{count}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Users className="h-3 w-3" /> usuários vinculados
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Matriz de permissões */}
      <Card>
        <CardHeader>
          <CardTitle>Matriz de Permissões</CardTitle>
          <CardDescription>Permissões atribuídas automaticamente conforme o perfil mapeado ao grupo do AD</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-primary-50/60 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-primary-700">Permissão</th>
                  {perfis.map((p) => (
                    <th key={p} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-primary-700">{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {permissoesDisponiveis.map((perm) => (
                  <tr key={perm.chave} className="hover:bg-primary-50/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-primary-900">{perm.label}</p>
                      <p className="text-xs text-muted-foreground">{perm.descricao}</p>
                    </td>
                    {perfis.map((perfil) => {
                      const has = permissoesPorPerfil[perfil].includes(perm.chave)
                      return (
                        <td key={perfil} className="px-4 py-3 text-center">
                          {has ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success-50 text-success-600 mx-auto">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400 mx-auto">
                              <X className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Grupos AD */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Network className="h-4 w-4" /> Mapeamento de Grupos AD → Perfis</CardTitle>
          <CardDescription>Grupos sincronizados do Active Directory e seus perfis correspondentes na aplicação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {gruposAD.map((g) => (
              <div key={g.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border p-4">
                <div>
                  <p className="font-semibold text-primary-900">{g.nomeGrupo}</p>
                  <p className="text-xs text-muted-foreground font-mono">{g.dn}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="neutral">{g.usuarios} usuários</Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge className={cn("border", perfilColors[g.perfilMapeado])}>{g.perfilMapeado}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

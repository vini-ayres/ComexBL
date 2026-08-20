import { Fragment, useEffect, useMemo, useState } from "react"
import { ShieldCheck, Users, Check, X, Network, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ApiStatePanel } from "@/components/shared/ApiStatePanel"
import { fetchRbacOverview, type RbacAdGroup, type RbacPerfil, type RbacPermissao } from "@/lib/api/rbac"
import { ApiError } from "@/lib/api/client"
import { cn, formatDateTime } from "@/lib/utils"

const perfilColors: Record<string, string> = {
  Administrador: "bg-danger-50 text-danger-700 border-danger-100",
  Supervisor: "bg-info-50 text-info-700 border-info-100",
  Operador: "bg-success-50 text-success-700 border-success-100",
}

const fallbackPerfilColor = "bg-secondary text-primary-700 border-border"

const moduloLabels: Record<string, string> = {
  operacao: "Operação",
  admin: "Administração",
}

function perfilBadgeClass(nome: string): string {
  return perfilColors[nome] ?? fallbackPerfilColor
}

const allowedPerfis = new Set(["Administrador", "Supervisor", "Operador"])

function visiblePerfis(perfis: RbacPerfil[], grupos: RbacAdGroup[]): RbacPerfil[] {
  const mappedNames = new Set(grupos.map((grupo) => grupo.perfilMapeado))
  return perfis.filter((perfil) =>
    allowedPerfis.has(perfil.nome) && (perfil.gruposAD.length > 0 || mappedNames.has(perfil.nome)),
  )
}

export default function RBAC() {
  const [perfis, setPerfis] = useState<RbacPerfil[]>([])
  const [permissoes, setPermissoes] = useState<RbacPermissao[]>([])
  const [grupos, setGrupos] = useState<RbacAdGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadRbac() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchRbacOverview()
      setPerfis(data.perfis)
      setPermissoes(data.permissoes)
      setGrupos(data.grupos)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar perfis e permissões.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRbac()
  }, [])

  const colunas = useMemo(() => visiblePerfis(perfis, grupos), [perfis, grupos])

  const permissoesPorModulo = useMemo(() => {
    const groups = new Map<string, RbacPermissao[]>()
    for (const permissao of permissoes) {
      const key = permissao.modulo ?? "geral"
      const list = groups.get(key) ?? []
      list.push(permissao)
      groups.set(key, list)
    }
    return [...groups.entries()]
  }, [permissoes])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando perfis e permissões...
      </div>
    )
  }

  if (error) {
    return (
      <ApiStatePanel
        variant="error"
        title="Perfis & Permissões"
        description={error}
        onRetry={() => void loadRbac()}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", colunas.length >= 3 ? "xl:grid-cols-3" : "")}>
        {colunas.map((perfil) => {
          const grupo = grupos.find((item) => item.perfilMapeado === perfil.nome) ?? null
          return (
            <Card key={perfil.nome}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Badge className={cn("border", perfilBadgeClass(perfil.nome))}>{perfil.nome}</Badge>
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-primary-900">{perfil.usuarios}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Users className="h-3 w-3" /> usuários vinculados
                </p>
                {perfil.descricao && (
                  <p className="text-xs text-muted-foreground mt-3">{perfil.descricao}</p>
                )}
                {(grupo?.nomeGrupo ?? perfil.gruposAD[0]) && (
                  <code className="mt-3 inline-block text-[11px] bg-secondary px-2 py-1 rounded text-primary-700">
                    {grupo?.nomeGrupo ?? perfil.gruposAD[0]}
                  </code>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matriz de Permissões</CardTitle>
          <CardDescription>
            Permissões atribuídas automaticamente conforme o perfil mapeado ao grupo do AD
          </CardDescription>
        </CardHeader>
        <CardContent>
          {permissoes.length === 0 || colunas.length === 0 ? (
            <ApiStatePanel
              variant="empty"
              title="Nenhuma permissão cadastrada"
              description="Os perfis GG_OCR_BL_ADMIN, GG_OCR_BL_SUPERVISOR e GG_OCR_BL_OPERADOR ainda não possuem permissões no banco."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-primary-50/60 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-primary-700">
                      Permissão
                    </th>
                    {colunas.map((perfil) => (
                      <th
                        key={perfil.nome}
                        className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-primary-700"
                      >
                        {perfil.nome}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {permissoesPorModulo.map(([modulo, items]) => (
                    <Fragment key={modulo}>
                      <tr className="bg-secondary/60">
                        <td
                          colSpan={colunas.length + 1}
                          className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-600"
                        >
                          {moduloLabels[modulo] ?? modulo}
                        </td>
                      </tr>
                      {items.map((perm) => (
                        <tr key={perm.chave} className="hover:bg-primary-50/30">
                          <td className="px-4 py-3">
                            <p className="font-medium text-primary-900">{perm.label}</p>
                            <p className="text-xs text-muted-foreground">{perm.descricao}</p>
                          </td>
                          {colunas.map((perfil) => {
                            const has = perfil.permissoes.includes(perm.chave)
                            return (
                              <td key={perfil.nome} className="px-4 py-3 text-center">
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
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-4 w-4" /> Mapeamento de Grupos AD → Perfis
          </CardTitle>
          <CardDescription>
            Grupos GG_OCR_BL_* sincronizados do Active Directory e seus perfis correspondentes na aplicação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {grupos.length === 0 ? (
            <ApiStatePanel
              variant="empty"
              title="Nenhum grupo AD mapeado"
              description="Cadastre GG_OCR_BL_ADMIN, GG_OCR_BL_SUPERVISOR e GG_OCR_BL_OPERADOR no banco para habilitar o provisionamento."
            />
          ) : (
            <div className="space-y-3">
              {grupos.map((grupo) => (
                <div
                  key={grupo.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border p-4"
                >
                  <div>
                    <p className="font-semibold text-primary-900">{grupo.nomeGrupo}</p>
                    <p className="text-xs text-muted-foreground font-mono">{grupo.dn}</p>
                    {grupo.sincronizadoEm && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Sincronizado em {formatDateTime(grupo.sincronizadoEm)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="neutral">{grupo.usuarios} usuários</Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge className={cn("border", perfilBadgeClass(grupo.perfilMapeado))}>
                      {grupo.perfilMapeado}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

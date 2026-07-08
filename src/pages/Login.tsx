import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Ship, Lock, User, ShieldCheck, Loader2, Network, KeyRound, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth, TEST_USER_CREDENTIALS } from "@/hooks/useAuth"
import { motion } from "framer-motion"

export default function Login() {
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const { loginWithLdap } = useAuth()
  const navigate = useNavigate()

  function fillTestUser() {
    setLogin(TEST_USER_CREDENTIALS.login)
    setPassword(TEST_USER_CREDENTIALS.password)
    setError("")
  }

  function copyCredentials() {
    navigator.clipboard?.writeText(`${TEST_USER_CREDENTIALS.login} / ${TEST_USER_CREDENTIALS.password}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const res = await loginWithLdap(login, password)
    setLoading(false)
    if (res.ok) {
      navigate("/")
    } else {
      setError(res.error || "Erro ao autenticar")
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-primary-950 relative overflow-hidden">
      {/* Background decor */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "28px 28px" }} />
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary-400/20 blur-3xl" />

      {/* Left branding panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 text-white relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent shadow-soft">
            <Ship className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">ComexBL</p>
            <p className="text-xs text-primary-300">GlobalSys Integration Platform</p>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-bold leading-tight mb-4">
            Gestão e validação inteligente de Bill of Lading
          </h1>
          <p className="text-primary-200 text-sm leading-relaxed">
            Plataforma corporativa para consulta, validação e conciliação de BLs
            processados via OCR, integrada ao GlobalSys, OneDrive e Active Directory.
          </p>

          <div className="mt-8 space-y-3">
            {[
              "Consulta e validação de dados extraídos automaticamente",
              "Comparação BL Final x GlobalSys com trilha de auditoria",
              "Autenticação corporativa via LDAP / Active Directory",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-primary-100">
                <ShieldCheck className="h-4 w-4 text-accent shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-primary-400">© 2026 ComexBL · Ambiente Corporativo Interno</p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center p-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full max-w-sm">
          <Card className="shadow-elevated border-white/10">
            <CardContent className="p-8">
              <div className="lg:hidden flex items-center gap-2.5 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <Ship className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-primary-900">ComexBL</span>
              </div>

              <h2 className="text-xl font-bold text-primary-900">Acesso Corporativo</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                Entre com suas credenciais de rede (Active Directory)
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login">Usuário de rede</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login"
                      placeholder="dominio\\usuario"
                      className="pl-9"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-danger-50 border border-danger-100 px-3 py-2 text-xs text-danger-700">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
                  {loading ? "Autenticando via LDAP..." : "Entrar com Active Directory"}
                </Button>
              </form>

              <div className="mt-6 rounded-lg border border-accent-100 bg-accent-50 px-3 py-3">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-700">
                    <KeyRound className="h-3.5 w-3.5" /> Usuário de teste
                  </p>
                  <button
                    type="button"
                    onClick={copyCredentials}
                    className="flex items-center gap-1 text-[11px] font-medium text-accent-700 hover:text-accent-800"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-white/70 px-2.5 py-1.5">
                  <code className="text-xs text-primary-900">
                    <span className="text-muted-foreground">login:</span> <strong>{TEST_USER_CREDENTIALS.login}</strong>{"  "}
                    <span className="text-muted-foreground">senha:</span> <strong>{TEST_USER_CREDENTIALS.password}</strong>
                  </code>
                  <Button type="button" variant="accent" size="xs" onClick={fillTestUser}>
                    Preencher
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-2.5 text-[11px] text-primary-700">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary-500" />
                Usuários são provisionados automaticamente via sincronismo de grupos do AD.
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

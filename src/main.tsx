import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "sonner"
import { AuthProvider } from "@/hooks/useAuth"
import { ProtectedRoute, PermissionRoute } from "@/components/layout/ProtectedRoute"
import { AppShell } from "@/components/layout/AppShell"
import { TooltipProvider } from "@/components/ui/tooltip"

import Login from "@/pages/Login"
import Dashboard from "@/pages/Dashboard"
import BLNaoEncontrado from "@/pages/BLNaoEncontrado"
import ApoioHumano from "@/pages/ApoioHumano"
import Divergencia from "@/pages/Divergencia"
import ProcessoFinalizado from "@/pages/ProcessoFinalizado"
import Usuarios from "@/pages/admin/Usuarios"
import RBAC from "@/pages/admin/RBAC"
import BLDatabase from "@/pages/admin/BLDatabase"
import LdapConfigPage from "@/pages/admin/LdapConfig"
import DatabaseConfigPage from "@/pages/admin/DatabaseConfig"

import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/bl-nao-encontrado" element={<BLNaoEncontrado />} />
              <Route path="/apoio-humano" element={<ApoioHumano />} />
              <Route path="/divergencia" element={<Divergencia />} />
              <Route path="/processo-finalizado" element={<ProcessoFinalizado />} />
              <Route path="/admin/bl-database" element={<PermissionRoute permission="visualizar_bl"><BLDatabase /></PermissionRoute>} />
              <Route path="/admin/usuarios" element={<PermissionRoute permission="administrar_usuarios"><Usuarios /></PermissionRoute>} />
              <Route path="/admin/rbac" element={<PermissionRoute permission="administrar_usuarios"><RBAC /></PermissionRoute>} />
              <Route path="/admin/ldap" element={<PermissionRoute permission="configurar_integracoes"><LdapConfigPage /></PermissionRoute>} />
              <Route path="/admin/banco-dados" element={<PermissionRoute permission="configurar_integracoes"><DatabaseConfigPage /></PermissionRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </TooltipProvider>
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)

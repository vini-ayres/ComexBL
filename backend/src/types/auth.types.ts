export interface AuthenticatedUser {
  id: number;
  login: string;
  email: string;
  displayName: string;
  status: string;
  primaryRole: string | null;
  primaryAdGroup: string | null;
  roles: string[];
  permissions: string[];
}

export interface AuthLoginResponse {
  token: string;
  user: {
    id: number;
    login: string;
    email: string;
    nome: string;
    perfil: string;
    grupoAD: string;
    permissoes: string[];
  };
}

export interface AdminUserListItem {
  id: number;
  login: string;
  email: string;
  nome: string;
  grupoAD: string;
  perfil: string;
  status: string;
  ultimoAcesso: string | null;
  sincronizadoEm: string | null;
  avatarColor: string | null;
}

export interface UserSyncResult {
  syncedAt: string;
  groupsProcessed: number;
  usersCreated: number;
  usersUpdated: number;
  usersDeactivated: number;
  totalActiveUsers: number;
}

export interface JwtPayload {
  sub: number;
  login: string;
}

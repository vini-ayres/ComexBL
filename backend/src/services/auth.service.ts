import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import {
  ForbiddenError,
  UnauthorizedError,
} from '../errors/AppError.js';
import { authRepository } from '../repositories/auth.repository.js';
import type {
  AuthLoginResponse,
  AuthenticatedUser,
  JwtPayload,
} from '../types/auth.types.js';
import { ldapService } from './ldap.service.js';
import { rbacService } from './rbac.service.js';
import { userSyncService } from './user-sync.service.js';

function parseJwtSubject(sub: unknown): number | null {
  if (typeof sub === 'number' && Number.isInteger(sub) && sub > 0) {
    return sub;
  }

  if (typeof sub === 'string' && /^\d+$/.test(sub)) {
    const parsed = Number(sub);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

export class AuthService {
  signToken(userId: number, login: string): string {
    const options: SignOptions = {
      expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'],
    };

    return jwt.sign({ sub: userId, login }, env.jwt.secret, options);
  }

  verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, env.jwt.secret);

      if (typeof decoded === 'string') {
        throw new UnauthorizedError('Sessão inválida ou expirada.');
      }

      const sub = parseJwtSubject(decoded.sub);

      if (sub === null) {
        throw new UnauthorizedError('Sessão inválida ou expirada.');
      }

      return {
        sub,
        login: String(decoded.login ?? ''),
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Sessão inválida ou expirada.');
    }
  }

  async login(
    login: string,
    password: string,
    ipAddress?: string | null,
  ): Promise<AuthLoginResponse> {
    const ldapUser = await ldapService.authenticateUser(login, password);
    const { userId } = await userSyncService.provisionUserFromLogin(ldapUser);
    const dbUser = await authRepository.findUserById(userId);

    if (!dbUser) {
      throw new UnauthorizedError('Usuário não encontrado após provisionamento.');
    }

    if (dbUser.Status === 'bloqueado') {
      throw new ForbiddenError('Usuário bloqueado. Contate o administrador.');
    }

    if (dbUser.Status === 'inativo') {
      throw new ForbiddenError('Usuário inativo. Contate o administrador.');
    }

    await authRepository.updateLastLogin(dbUser.Id);

    const authUser = rbacService.mapUserToAuthenticatedUser(dbUser);
    const token = this.signToken(authUser.id, authUser.login);

    await authRepository.writeAuditLog({
      userId: authUser.id,
      userLogin: authUser.login,
      action: 'login',
      entityType: 'auth',
      ipAddress,
    });

    return {
      token,
      user: {
        id: authUser.id,
        login: authUser.login,
        email: authUser.email,
        nome: authUser.displayName,
        perfil: authUser.primaryRole ?? 'Operador',
        grupoAD: authUser.primaryAdGroup ?? '—',
        permissoes: authUser.permissions,
      },
    };
  }

  async getAuthenticatedUser(token: string): Promise<AuthenticatedUser> {
    const payload = this.verifyToken(token);
    const dbUser = await authRepository.findUserById(payload.sub);

    if (!dbUser) {
      throw new UnauthorizedError('Usuário não encontrado.');
    }

    if (dbUser.Status === 'bloqueado' || dbUser.Status === 'inativo') {
      throw new ForbiddenError('Usuário sem permissão de acesso.');
    }

    return rbacService.mapUserToAuthenticatedUser(dbUser);
  }
}

export const authService = new AuthService();

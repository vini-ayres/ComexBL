import type { Request, Response } from 'express';
import { BadRequestError } from '../errors/AppError.js';
import { authRepository } from '../repositories/auth.repository.js';
import { authService } from '../services/auth.service.js';
import { getClientIp } from '../middlewares/auth.middleware.js';

export class AuthController {
  login = async (req: Request, res: Response): Promise<void> => {
    const login = String(req.body?.login ?? '').trim();
    const password = String(req.body?.password ?? '');

    if (!login || !password) {
      throw new BadRequestError('Informe usuário e senha de rede.');
    }

    const result = await authService.login(login, password, getClientIp(req));
    res.json(result);
  };

  me = async (req: Request, res: Response): Promise<void> => {
    const user = req.authUser!;
    const token = authService.signToken(user.id, user.login);

    res.json({
      id: user.id,
      login: user.login,
      email: user.email,
      nome: user.displayName,
      perfil: user.primaryRole ?? 'Operador',
      grupoAD: user.primaryAdGroup ?? '—',
      permissoes: user.permissions,
      roles: user.roles,
      token,
    });
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await authRepository.writeAuditLog({
      userId: req.authUser?.id,
      userLogin: req.authUser?.login ?? 'unknown',
      action: 'logout',
      entityType: 'auth',
      ipAddress: getClientIp(req),
    });

    res.status(204).send();
  };
}

export const authController = new AuthController();

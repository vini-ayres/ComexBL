import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';
import { authService } from '../services/auth.service.js';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim();
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      throw new UnauthorizedError('Token de autenticação ausente.');
    }

    req.authUser = await authService.getAuthenticatedUser(token);
    next();
  } catch (error) {
    next(error);
  }
}

export function requirePermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      next(new UnauthorizedError());
      return;
    }

    const allowed = permissions.some((permission) =>
      req.authUser!.permissions.includes(permission),
    );

    if (!allowed) {
      next(new ForbiddenError('Você não possui permissão para esta operação.'));
      return;
    }

    next();
  };
}

export function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? null;
  }

  return req.socket.remoteAddress ?? null;
}

import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import { logger } from '../config/logger.js';

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    logger.warn(`Erro operacional: ${error.message}`, {
      statusCode: error.statusCode,
    });

    res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
    });
    return;
  }

  const message =
    error instanceof Error ? error.message : 'Erro interno do servidor';

  logger.error('Erro não tratado', error);

  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : message,
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    status: 'error',
    message: 'Rota não encontrada',
  });
}

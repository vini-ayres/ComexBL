export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly isOperational = true,
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Erro de conexão com o banco de dados') {
    super(503, message);
    this.name = 'DatabaseError';
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Requisição inválida') {
    super(400, message);
    this.name = 'BadRequestError';
  }
}

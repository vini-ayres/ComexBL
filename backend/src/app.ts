import express from 'express';
import { routes } from './routes/index.js';
import { corsMiddleware } from './middlewares/cors.middleware.js';
import {
  errorHandler,
  notFoundHandler,
} from './middlewares/error.middleware.js';
import { requestLogger } from './middlewares/request-logger.middleware.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(corsMiddleware);
  app.use(express.json());
  app.use(requestLogger);
  app.use(routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

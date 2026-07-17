import { Router } from 'express';
import { blRoutes } from './bl.routes.js';
import { healthRoutes } from './health.routes.js';

export const routes = Router();

routes.use('/health', healthRoutes);
routes.use('/bl', blRoutes);

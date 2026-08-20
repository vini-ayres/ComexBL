import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { adminRoutes } from './admin.routes.js';
import { authRoutes } from './auth.routes.js';
import { blRoutes } from './bl.routes.js';
import { filesRoutes } from './files.routes.js';
import { healthRoutes } from './health.routes.js';

export const routes = Router();

routes.use('/health', healthRoutes);
routes.use('/auth', authRoutes);
routes.use('/admin', adminRoutes);
routes.use('/bl', requireAuth, blRoutes);
routes.use('/files', requireAuth, filesRoutes);

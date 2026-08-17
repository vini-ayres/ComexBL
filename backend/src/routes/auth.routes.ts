import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

export const authRoutes = Router();

authRoutes.post('/login', authController.login);
authRoutes.get('/me', requireAuth, authController.me);
authRoutes.post('/logout', requireAuth, authController.logout);

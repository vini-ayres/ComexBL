import { Router } from 'express';
import { HealthController } from '../controllers/health.controller.js';
import { databaseRepository } from '../repositories/database.repository.js';
import { HealthService } from '../services/health.service.js';

const healthService = new HealthService(databaseRepository);
const healthController = new HealthController(healthService);

export const healthRoutes = Router();

healthRoutes.get('/', healthController.getHealth);

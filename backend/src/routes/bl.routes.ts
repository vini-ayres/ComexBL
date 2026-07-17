import { Router } from 'express';
import { ApoioHumanoController } from '../controllers/apoio-humano.controller.js';
import { BlController } from '../controllers/bl.controller.js';
import { BlNaoEncontradoController } from '../controllers/bl-nao-encontrado.controller.js';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { apoioHumanoRepository } from '../repositories/apoio-humano.repository.js';
import { blNaoEncontradoRepository } from '../repositories/bl-nao-encontrado.repository.js';
import {
  blHouseRepository,
  blMasterRepository,
} from '../repositories/bl.repository.js';
import { dashboardRepository } from '../repositories/dashboard.repository.js';
import { globalSysBlRepository } from '../repositories/globalsys-bl.repository.js';
import { ApoioHumanoService } from '../services/apoio-humano.service.js';
import { BlService } from '../services/bl.service.js';
import { DashboardService } from '../services/dashboard.service.js';
import { GlobalSysConsultaService } from '../services/globalsys-consulta.service.js';

const blService = new BlService(blMasterRepository, blHouseRepository);
const blController = new BlController(blService);

const apoioHumanoService = new ApoioHumanoService(apoioHumanoRepository);
const apoioHumanoController = new ApoioHumanoController(apoioHumanoService);

const dashboardService = new DashboardService(dashboardRepository);
const dashboardController = new DashboardController(dashboardService);

const globalSysConsultaService = new GlobalSysConsultaService(
  blNaoEncontradoRepository,
  globalSysBlRepository,
);
const blNaoEncontradoController = new BlNaoEncontradoController(
  globalSysConsultaService,
);

export const blRoutes = Router();

blRoutes.get('/dashboard', dashboardController.getDashboard);
blRoutes.get('/dashboard/kpis', dashboardController.getKpis);
blRoutes.get('/dashboard/items', dashboardController.listItems);
blRoutes.get('/apoio-humano', apoioHumanoController.getQueueItem);
blRoutes.post('/apoio-humano/:tipo/:id/campos', apoioHumanoController.saveCampos);
blRoutes.get('/nao-encontrado', blNaoEncontradoController.list);
blRoutes.get('/nao-encontrado/:tipo/:id', blNaoEncontradoController.getDetail);
blRoutes.post(
  '/nao-encontrado/:tipo/:id/reprocessar',
  blNaoEncontradoController.reprocessar,
);
blRoutes.post('/globalsys/consultar/:tipo/:id', blNaoEncontradoController.consultar);
blRoutes.get('/masters', blController.listMasters);
blRoutes.get('/masters/:id', blController.getMasterById);
blRoutes.get('/houses', blController.listHouses);
blRoutes.get('/houses/:id', blController.getHouseById);
blRoutes.get('/stats', blController.getStats);

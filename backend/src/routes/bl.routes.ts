import { Router } from 'express';

import { ApoioHumanoController } from '../controllers/apoio-humano.controller.js';

import { BlController } from '../controllers/bl.controller.js';

import { BlFinalController } from '../controllers/bl-final.controller.js';

import { BlLotController } from '../controllers/bl-lot.controller.js';

import { BlNaoEncontradoController } from '../controllers/bl-nao-encontrado.controller.js';

import { BlVersionController } from '../controllers/bl-version.controller.js';

import { ConferenciaHouseMasterController } from '../controllers/conferencia-house-master.controller.js';

import { DashboardController } from '../controllers/dashboard.controller.js';

import { DivergenciaController } from '../controllers/divergencia.controller.js';

import { GlobalSysController } from '../controllers/globalsys.controller.js';

import { ProcessoController } from '../controllers/processo.controller.js';

import { WorkflowController } from '../controllers/workflow.controller.js';

import { requirePermission } from '../middlewares/auth.middleware.js';

import {

  apoioHumanoService,

  blFinalService,

  blService,

  blLotService,

  conferenciaHouseMasterService,

  dashboardService,

  divergenciaService,

  globalSysConsultaService,

  globalSysService,

  processoService,

  workflowService,

} from '../container.js';



const blController = new BlController(blService);

const blVersionController = new BlVersionController(blService);

const blFinalController = new BlFinalController(blFinalService);

const apoioHumanoController = new ApoioHumanoController(apoioHumanoService);

const conferenciaHouseMasterController = new ConferenciaHouseMasterController(
  conferenciaHouseMasterService,
);

const divergenciaController = new DivergenciaController(divergenciaService);

const globalSysController = new GlobalSysController(globalSysService);

const workflowController = new WorkflowController(workflowService);

const processoController = new ProcessoController(processoService);

const dashboardController = new DashboardController(dashboardService);

const blLotController = new BlLotController(blLotService);

const blNaoEncontradoController = new BlNaoEncontradoController(

  globalSysConsultaService,

);



export const blRoutes = Router();



// Dashboard (legado por Id)

blRoutes.get('/dashboard', dashboardController.getDashboard);

blRoutes.get('/dashboard/kpis', dashboardController.getKpis);

blRoutes.get('/dashboard/items', dashboardController.listItems);



// Apoio Humano (legado por Id)

blRoutes.get('/apoio-humano', apoioHumanoController.getQueueItem);

blRoutes.post('/apoio-humano/:tipo/:id/campos', apoioHumanoController.saveCampos);



// Conferência House × Master (peso, volume, embalagem)

blRoutes.get('/conferencia-house-master', conferenciaHouseMasterController.getQueueItem);

blRoutes.patch('/conferencia-house-master/:id/resolve', conferenciaHouseMasterController.resolve);

blRoutes.patch(
  '/conferencia-house-master/:id/campos/:campoKey/resolve',
  conferenciaHouseMasterController.resolveCampo,
);

blRoutes.get(
  '/conferencia-house-master/by-id/:id',
  conferenciaHouseMasterController.getById,
);

blRoutes.get(
  '/conferencia-house-master/:tipo/:documentNumber/latest',
  conferenciaHouseMasterController.getLatest,
);

blRoutes.get(
  '/conferencia-house-master/:tipo/:documentNumber/compare',
  conferenciaHouseMasterController.compare,
);

blRoutes.post(
  '/conferencia-house-master/:tipo/:documentNumber/compare-and-persist',
  conferenciaHouseMasterController.compareAndPersist,
);



// BL Não Encontrado (legado por Id)

blRoutes.get('/nao-encontrado', blNaoEncontradoController.list);

blRoutes.get('/nao-encontrado/:tipo/:id', blNaoEncontradoController.getDetail);

blRoutes.post(

  '/nao-encontrado/:tipo/:id/reprocessar',

  blNaoEncontradoController.reprocessar,

);



// GlobalSys — legado por Id (mantido)

blRoutes.post('/globalsys/consultar/:tipo/:id', blNaoEncontradoController.consultar);



// GlobalSys — novos endpoints por MasterNumber/HouseNumber

blRoutes.get('/globalsys/lookup/:numeroBl', globalSysController.lookup);

blRoutes.get(

  '/globalsys/:tipo/:documentNumber/context',

  globalSysController.getFinalContext,

);

blRoutes.post(
  // FINAL recebido → BL Final consolidado × GlobalSys (não DRAFT × FINAL)
  '/globalsys/:tipo/:documentNumber/final-received',
  globalSysController.onFinalReceived,
);



// Divergência — resolução (Sprint 7B)

blRoutes.patch('/divergencia/:id/resolve', divergenciaController.resolve);

blRoutes.patch(
  '/divergencia/:id/campos/:campoKey/resolve',
  divergenciaController.resolveCampo,
);

// Divergência — consulta persistida (latest retorna comparisonKind, comparisonStatus, workflow, origin)

blRoutes.get(
  '/divergencia/by-id/:id',
  divergenciaController.getById,
);

blRoutes.get(
  '/divergencia/:tipo/:documentNumber/latest',
  divergenciaController.getLatest,
);

// Divergência DRAFT × FINAL (comparisonKind: DRAFT_FINAL)

blRoutes.get(

  '/divergencia/:tipo/:documentNumber/compare',

  divergenciaController.compare,

);

blRoutes.post(

  '/divergencia/:tipo/:documentNumber/compare-and-persist',

  divergenciaController.compareAndPersist,

);



// Divergência BL Final × GlobalSys (comparisonKind: GLOBALSYS)

blRoutes.get(

  '/divergencia/:tipo/:documentNumber/compare-globalsys',

  divergenciaController.compareGlobalSys,

);

blRoutes.post(

  '/divergencia/:tipo/:documentNumber/compare-globalsys-and-persist',

  divergenciaController.compareGlobalSysAndPersist,

);



// Workflow por número + BlVersion

blRoutes.get('/workflow/:tipo/:documentNumber', workflowController.getByDocument);

// Timeline do processo (Sprint 7B)

blRoutes.get(
  '/processo/:tipo/:documentNumber/timeline',
  processoController.getTimeline,
);



// BL version-aware (MasterNumber/HouseNumber + BlVersion)

blRoutes.get(
  '/masters/by-number/:masterNumber/bl-final',
  blFinalController.getMasterBlFinal,
);

blRoutes.get(
  '/houses/by-number/:houseNumber/bl-final',
  blFinalController.getHouseBlFinal,
);

blRoutes.get(

  '/masters/by-number/:masterNumber/pair',

  blVersionController.getMasterPair,

);

blRoutes.get(

  '/masters/by-number/:masterNumber/consolidation',

  blVersionController.validateConsolidation,

);

blRoutes.get(

  '/masters/by-number/:masterNumber',

  blVersionController.getMasterByNumber,

);

blRoutes.get(

  '/houses/by-number/:houseNumber/pair',

  blVersionController.getHousePair,

);

blRoutes.get(

  '/houses/by-number/:houseNumber',

  blVersionController.getHouseByNumber,

);

blRoutes.get(

  '/relationship/:masterNumber/:houseNumber',

  blVersionController.validateMasterHouse,

);



// BL Database (legado por Id) — lote Master/House + XML consolidado

blRoutes.get('/masters', blLotController.listMasters);

blRoutes.get('/masters/:id', blLotController.getMasterById);

blRoutes.patch(
  '/masters/:id/hbl-count',
  requirePermission('editar_bl'),
  blLotController.updateHblCount,
);

blRoutes.post(
  '/masters/:id/xml-dispatch',
  requirePermission('editar_bl'),
  blLotController.dispatchXml,
);

blRoutes.post(
  '/masters/:id/validacao-manual',
  requirePermission('editar_bl'),
  blLotController.validacaoManual,
);

blRoutes.post(
  '/masters/:id/houses/:houseId/link',
  requirePermission('editar_bl'),
  blLotController.linkHouse,
);

blRoutes.post(
  '/masters/:id/houses/:houseId/unlink',
  requirePermission('editar_bl'),
  blLotController.unlinkHouse,
);

blRoutes.get('/houses', blController.listHouses);

blRoutes.get('/houses/:id', blController.getHouseById);

blRoutes.get('/stats', blController.getStats);


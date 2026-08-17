import { apoioHumanoRepository } from './repositories/apoio-humano.repository.js';

import { blConsultaGlobalSysRepository } from './repositories/bl-consulta-globalsys.repository.js';

import { blDivergenciaCampoRepository } from './repositories/bl-divergencia-campo.repository.js';

import { blHistoricoAlteracaoRepository } from './repositories/bl-historico-alteracao.repository.js';

import {

  blDivergenciaRepository,

  blHouseRepository,

  blMasterRepository,

  blWorkflowRepository,

} from './repositories/bl.repository.js';

import { blNaoEncontradoRepository } from './repositories/bl-nao-encontrado.repository.js';

import { dashboardRepository } from './repositories/dashboard.repository.js';

import { globalSysBlRepository } from './repositories/globalsys-bl.repository.js';

import { ApoioHumanoService } from './services/apoio-humano.service.js';

import { BlFinalService } from './services/bl-final.service.js';

import { BlService } from './services/bl.service.js';

import { DashboardService } from './services/dashboard.service.js';

import { DivergenciaService } from './services/divergencia.service.js';

import { GlobalSysConsultaService } from './services/globalsys-consulta.service.js';

import { GlobalSysService } from './services/globalsys.service.js';

import { GlobalSysXmlDispatchService } from './services/globalsys-xml-dispatch.service.js';

import { processoService } from './services/processo.service.js';

import { WorkflowService } from './services/workflow.service.js';

import { relationshipValidator } from './validators/relationship-validator.js';

import { env } from './config/env.js';



export const globalSysXmlDispatchService = new GlobalSysXmlDispatchService(

  blMasterRepository,

  blHouseRepository,

  blWorkflowRepository,

  relationshipValidator,

  env.n8n.webhookEnviarXmlGlobalsysUrl,

);



export const workflowService = new WorkflowService(

  blWorkflowRepository,

  blMasterRepository,

  blHouseRepository,

  globalSysXmlDispatchService,

);



export const blFinalService = new BlFinalService(

  blMasterRepository,

  blHouseRepository,

  apoioHumanoRepository,

);



export const divergenciaService = new DivergenciaService(

  blMasterRepository,

  blHouseRepository,

  blDivergenciaRepository,

  blDivergenciaCampoRepository,

  blHistoricoAlteracaoRepository,

  workflowService,

  blFinalService,

  globalSysBlRepository,

);



export const globalSysService = new GlobalSysService(

  blMasterRepository,

  blHouseRepository,

  blConsultaGlobalSysRepository,

  globalSysBlRepository,

  workflowService,

  divergenciaService,

);



export const globalSysConsultaService = new GlobalSysConsultaService(

  blNaoEncontradoRepository,

  globalSysService,

  blConsultaGlobalSysRepository,

  blMasterRepository,

  blHouseRepository,

);



export const blService = new BlService(

  blMasterRepository,

  blHouseRepository,

  relationshipValidator,

);



export const apoioHumanoService = new ApoioHumanoService(

  apoioHumanoRepository,

  workflowService,

  divergenciaService,

  globalSysConsultaService,

);



export const dashboardService = new DashboardService(
  dashboardRepository,
  apoioHumanoService,
);

export { processoService };

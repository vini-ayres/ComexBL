import type { GlobalSysFinalPairContext } from '../services/globalsys.service.js';
import type { GlobalSysConsultaResult } from '../types/globalsys.types.js';
import type {
  GlobalSysFinalContextResponseDto,
  GlobalSysFinalReceivedResponseDto,
  GlobalSysLookupResponseDto,
} from '../types/globalsys-api.types.js';
import { mapGlobalSysBlRecord } from './globalsys-bl.mapper.js';
import { mapDivergenciaGlobalSysPersist } from './divergencia.mapper.js';

export function mapGlobalSysLookup(
  numeroBl: string,
  result: GlobalSysConsultaResult,
): GlobalSysLookupResponseDto {
  return {
    found: result.found,
    numeroBl,
    bl: mapGlobalSysBlRecord(result.record),
  };
}

export function mapGlobalSysFinalContext(
  context: GlobalSysFinalPairContext<unknown>,
): GlobalSysFinalContextResponseDto {
  return {
    documentType: context.documentType,
    documentNumber: context.documentNumber,
    hasDraft: context.draft != null,
    hasFinal: context.final != null,
    consultaGlobalSys: context.consultaGlobalSys
      ? {
          found: context.consultaGlobalSys.found,
          numeroBl: context.documentNumber,
        }
      : null,
  };
}

export function mapGlobalSysFinalReceived(
  payload: Awaited<
    ReturnType<
      import('../services/globalsys.service.js').GlobalSysService['onFinalReceived']
    >
  >,
): GlobalSysFinalReceivedResponseDto {
  const comparison = mapDivergenciaGlobalSysPersist(payload.comparison);

  return {
    documentType: payload.context.documentType,
    documentNumber: payload.context.documentNumber,
    message: payload.message,
    comparison,
    workflow: comparison.workflow,
  };
}

import type { Request, Response } from 'express';
import { NotFoundError } from '../errors/AppError.js';
import {
  mapBlVersionHouseDetail,
  mapBlVersionMasterDetail,
  mapBlVersionPair,
  mapConsolidationValidation,
  mapMasterHouseValidation,
} from '../mappers/bl-version.mapper.js';
import type { BlService } from '../services/bl.service.js';
import {
  parseBlVersionQuery,
  parseDocumentNumberParam,
} from '../utils/bl-http-params.js';

export class BlVersionController {
  constructor(private readonly blService: BlService) {}

  getMasterByNumber = async (req: Request, res: Response): Promise<void> => {
    const masterNumber = parseDocumentNumberParam(String(req.params.masterNumber));
    const blVersion = parseBlVersionQuery(req.query.version, { required: true });

    const result = await this.blService.locateMasterWithHouses(
      masterNumber,
      blVersion,
    );

    if (!result) {
      throw new NotFoundError(
        `Master ${masterNumber} (${blVersion}) não encontrado`,
      );
    }

    res.json(mapBlVersionMasterDetail(result));
  };

  getMasterPair = async (req: Request, res: Response): Promise<void> => {
    const masterNumber = parseDocumentNumberParam(String(req.params.masterNumber));
    const pair = await this.blService.locateMasterVersionPair(masterNumber);

    res.json(
      mapBlVersionPair(pair, (value) => mapBlVersionMasterDetail(value)),
    );
  };

  validateConsolidation = async (req: Request, res: Response): Promise<void> => {
    const masterNumber = parseDocumentNumberParam(String(req.params.masterNumber));
    const blVersion = parseBlVersionQuery(req.query.version, { required: true });

    const result = await this.blService.validateConsolidation(
      masterNumber,
      blVersion,
    );

    res.json(mapConsolidationValidation(masterNumber, blVersion, result));
  };

  getHouseByNumber = async (req: Request, res: Response): Promise<void> => {
    const houseNumber = parseDocumentNumberParam(String(req.params.houseNumber));
    const blVersion = parseBlVersionQuery(req.query.version, { required: true });

    const result = await this.blService.locateHouseWithRelations(
      houseNumber,
      blVersion,
    );

    if (!result) {
      throw new NotFoundError(
        `House ${houseNumber} (${blVersion}) não encontrado`,
      );
    }

    res.json(mapBlVersionHouseDetail(result));
  };

  getHousePair = async (req: Request, res: Response): Promise<void> => {
    const houseNumber = parseDocumentNumberParam(String(req.params.houseNumber));
    const pair = await this.blService.locateHouseVersionPair(houseNumber);

    res.json(
      mapBlVersionPair(pair, (value) => mapBlVersionHouseDetail(value)),
    );
  };

  validateMasterHouse = async (req: Request, res: Response): Promise<void> => {
    const masterNumber = parseDocumentNumberParam(String(req.params.masterNumber));
    const houseNumber = parseDocumentNumberParam(String(req.params.houseNumber));
    const blVersion = parseBlVersionQuery(req.query.version, { required: true });

    const result = await this.blService.validateMasterHouseRelationship(
      masterNumber,
      houseNumber,
      blVersion,
    );

    res.json(
      mapMasterHouseValidation(masterNumber, houseNumber, blVersion, result),
    );
  };
}

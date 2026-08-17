import { Router } from 'express';
import { FilesController } from '../controllers/files.controller.js';
import { filesService } from '../services/files.service.js';

const filesController = new FilesController(filesService);

export const filesRoutes = Router();

filesRoutes.get('/by-bl/:tipo/:id', filesController.getByBl);
filesRoutes.get('/:fileName', filesController.getByFileName);

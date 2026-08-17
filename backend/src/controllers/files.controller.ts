import type { Request, Response } from 'express';
import { BadRequestError } from '../errors/AppError.js';
import { FilesService } from '../services/files.service.js';
import { parseOptionalInt } from '../utils/pagination.js';

export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  getByFileName = async (req: Request, res: Response): Promise<void> => {
    const rawName = String(req.params.fileName ?? '');
    const file = await this.filesService.getFileByName(rawName);

    this.sendFile(res, file.fileName, file.mimeType, file.size, file.absolutePath);
  };

  getByBl = async (req: Request, res: Response): Promise<void> => {
    const blId = parseOptionalInt(req.params.id);

    if (!blId) {
      throw new BadRequestError('ID inválido');
    }

    const file = await this.filesService.getFileByBl(
      String(req.params.tipo ?? ''),
      blId,
    );

    this.sendFile(res, file.fileName, file.mimeType, file.size, file.absolutePath);
  };

  private sendFile(
    res: Response,
    fileName: string,
    mimeType: string,
    size: number,
    absolutePath: string,
  ): void {
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', String(size));
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${fileName.replace(/"/g, '')}"`,
    );
    res.setHeader('Cache-Control', 'private, max-age=60');

    const stream = this.filesService.openReadStream(absolutePath);

    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({
          status: 'error',
          message: 'Falha ao ler o arquivo',
        });
        return;
      }

      res.destroy();
    });

    stream.pipe(res);
  }
}

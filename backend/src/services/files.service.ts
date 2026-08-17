import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { basename, extname, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';
import { BadRequestError, NotFoundError } from '../errors/AppError.js';
import { env } from '../config/env.js';
import { prisma } from '../prisma/client.js';

const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.bmp': 'image/bmp',
  '.txt': 'text/plain; charset=utf-8',
};

export interface LocalFileInfo {
  fileName: string;
  absolutePath: string;
  mimeType: string;
  size: number;
}

function sanitizeFileName(raw: string): string {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new BadRequestError('Nome de arquivo inválido');
  }

  const safeName = basename(trimmed);

  if (
    safeName !== trimmed ||
    safeName === '.' ||
    safeName === '..' ||
    safeName.includes('\0')
  ) {
    throw new BadRequestError('Nome de arquivo inválido');
  }

  return safeName;
}

function resolveInsideFilesDir(fileName: string): string {
  const absolutePath = resolve(env.files.dir, fileName);
  const root = resolve(env.files.dir);
  const prefix = root.endsWith(sep) ? root : `${root}${sep}`;

  if (absolutePath !== root && !absolutePath.startsWith(prefix)) {
    throw new BadRequestError('Caminho de arquivo inválido');
  }

  return absolutePath;
}

function mimeTypeFor(fileName: string): string {
  const ext = extname(fileName).toLowerCase();
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

export class FilesService {
  async getFileByName(rawFileName: string): Promise<LocalFileInfo> {
    const fileName = sanitizeFileName(rawFileName);
    const absolutePath = resolveInsideFilesDir(fileName);

    try {
      await access(absolutePath);
    } catch {
      throw new NotFoundError(`Arquivo não encontrado: ${fileName}`);
    }

    const fileStat = await stat(absolutePath);

    if (!fileStat.isFile()) {
      throw new NotFoundError(`Arquivo não encontrado: ${fileName}`);
    }

    return {
      fileName,
      absolutePath,
      mimeType: mimeTypeFor(fileName),
      size: fileStat.size,
    };
  }

  async getFileByBl(
    tipo: string,
    blId: number,
  ): Promise<LocalFileInfo & { tipo: 'Master' | 'House'; blId: number }> {
    const normalized = tipo.trim().toLowerCase();

    if (normalized !== 'master' && normalized !== 'house') {
      throw new BadRequestError('Tipo deve ser Master ou House');
    }

    const fileName =
      normalized === 'master'
        ? (
            await prisma.blMaster.findUnique({
              where: { Id: blId },
              select: { FileName: true },
            })
          )?.FileName
        : (
            await prisma.blHouse.findUnique({
              where: { Id: blId },
              select: { FileName: true },
            })
          )?.FileName;

    if (!fileName) {
      throw new NotFoundError(
        `BL ${normalized === 'master' ? 'Master' : 'House'} ${blId} sem FileName associado`,
      );
    }

    const file = await this.getFileByName(fileName);

    return {
      ...file,
      tipo: normalized === 'master' ? 'Master' : 'House',
      blId,
    };
  }

  openReadStream(absolutePath: string): Readable {
    return createReadStream(absolutePath);
  }
}

export const filesService = new FilesService();

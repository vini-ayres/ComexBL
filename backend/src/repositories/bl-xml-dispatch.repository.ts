import { Prisma, type BlXmlDispatch } from '@prisma/client';
import { XML_DISPATCH_STATUS } from '../constants/xml-dispatch.constants.js';
import { prisma } from '../prisma/client.js';

export class BlXmlDispatchRepository {
  async findByMasterId(blMasterId: number): Promise<BlXmlDispatch | null> {
    return prisma.blXmlDispatch.findUnique({
      where: { BlMasterId: blMasterId },
    });
  }

  async findByMasterIds(blMasterIds: number[]): Promise<BlXmlDispatch[]> {
    if (blMasterIds.length === 0) {
      return [];
    }

    return prisma.blXmlDispatch.findMany({
      where: { BlMasterId: { in: blMasterIds } },
    });
  }

  async claimForDispatch(
    blMasterId: number,
    force: boolean,
  ): Promise<'claimed' | 'already_sent' | 'in_progress'> {
    const existing = await this.findByMasterId(blMasterId);
    const claimCheck = this.evaluateExisting(existing, force);

    if (claimCheck !== 'claimed') {
      return claimCheck;
    }

    if (!existing) {
      try {
        await prisma.blXmlDispatch.create({
          data: {
            BlMasterId: blMasterId,
            Status: XML_DISPATCH_STATUS.PENDENTE,
            LastError: null,
          },
        });
        return 'claimed';
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) {
          throw error;
        }

        const concurrent = await this.findByMasterId(blMasterId);
        const concurrentCheck = this.evaluateExisting(concurrent, force);

        if (concurrentCheck !== 'claimed') {
          return concurrentCheck;
        }

        await this.markPendente(blMasterId);
        return 'claimed';
      }
    }

    await this.markPendente(blMasterId);
    return 'claimed';
  }

  async markEnviado(blMasterId: number): Promise<void> {
    await prisma.blXmlDispatch.update({
      where: { BlMasterId: blMasterId },
      data: {
        Status: XML_DISPATCH_STATUS.ENVIADO,
        DispatchedAt: new Date(),
        LastError: null,
      },
    });
  }

  async markFalhou(blMasterId: number, errorMessage: string): Promise<void> {
    await prisma.blXmlDispatch.update({
      where: { BlMasterId: blMasterId },
      data: {
        Status: XML_DISPATCH_STATUS.FALHOU,
        LastError: errorMessage.slice(0, 1000),
      },
    });
  }

  private async markPendente(blMasterId: number): Promise<void> {
    await prisma.blXmlDispatch.update({
      where: { BlMasterId: blMasterId },
      data: {
        Status: XML_DISPATCH_STATUS.PENDENTE,
        LastError: null,
      },
    });
  }

  private evaluateExisting(
    existing: BlXmlDispatch | null,
    force: boolean,
  ): 'claimed' | 'already_sent' | 'in_progress' {
    if (!existing) {
      return 'claimed';
    }

    if (existing.Status === XML_DISPATCH_STATUS.ENVIADO && !force) {
      return 'already_sent';
    }

    if (existing.Status === XML_DISPATCH_STATUS.PENDENTE && !force) {
      return 'in_progress';
    }

    return 'claimed';
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}

export const blXmlDispatchRepository = new BlXmlDispatchRepository();

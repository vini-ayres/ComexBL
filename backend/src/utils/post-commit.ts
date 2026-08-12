import { logger } from '../config/logger.js';

/**
 * Executa callback após persistência. Quando há transação Prisma ativa,
 * adia a execução para permitir commit antes de efeitos colaterais (ex.: webhooks).
 */
export function runAfterCommit(
  hasActiveTransaction: boolean,
  callback: () => void | Promise<void>,
): void {
  const run = () => {
    void Promise.resolve(callback()).catch((error: unknown) => {
      logger.error('Falha em callback pós-commit', error);
    });
  };

  if (!hasActiveTransaction) {
    run();
    return;
  }

  setTimeout(run, 100);
}

/** Opções para transações interativas com muitas operações (ex.: Apoio Humano). */
export const PRISMA_EXTENDED_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 30_000,
} as const;

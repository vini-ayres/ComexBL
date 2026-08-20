import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatGlobalSysPersistError,
  truncatePendencia,
} from './prisma-error.utils.js';

describe('formatGlobalSysPersistError', () => {
  it('hides Prisma unique constraint dumps for BL_DivergenciaCampo', () => {
    const raw = `Invalid \`this.client(tx).blDivergenciaCampo.createMany()\` invocation in
/home/infra/ComexBL/backend/src/repositories/bl-divergencia-campo.repository.ts:42:61

Unique constraint failed on the constraint: \`dbo.BL_DivergenciaCampo\``;

    const formatted = formatGlobalSysPersistError(new Error(raw));

    assert.equal(
      formatted.includes('createMany'),
      false,
    );
    assert.equal(
      formatted.includes('invocation in'),
      false,
    );
    assert.match(formatted, /chave duplicada/i);
  });
});

describe('truncatePendencia', () => {
  it('collapses whitespace and respects max length', () => {
    const value = truncatePendencia('Erro   na\ncomparação   x'.repeat(80), 40);
    assert.ok(value.length <= 40);
    assert.equal(value.includes('\n'), false);
  });
});

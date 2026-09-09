import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  APOIO_HUMANO_SAVE_MESSAGES,
  isContainerNumberCampoKey,
  isEmptyApoioHumanoValue,
  resolveApoioHumanoCampoEffectiveValue,
  validateApoioHumanoSave,
} from './apoio-humano-save-rules.js';

function campo(overrides: {
  campoKey?: string;
  campoLabel?: string;
  valorRecebido?: string;
  valorManual?: string | null;
  status?: string;
}) {
  return {
    campoKey: 'ShipperName',
    valorRecebido: 'ACME',
    valorManual: null,
    status: 'confirmado',
    ...overrides,
  };
}

describe('apoio-humano-save-rules', () => {
  it('identifica ContainerNumber mesmo com prefixo', () => {
    assert.equal(isContainerNumberCampoKey('ContainerNumber'), true);
    assert.equal(isContainerNumberCampoKey('house.X.ContainerNumber'), true);
    assert.equal(isContainerNumberCampoKey('ItemName'), false);
  });

  it('trata hífen, travessão e branco como vazio', () => {
    assert.equal(isEmptyApoioHumanoValue('-'), true);
    assert.equal(isEmptyApoioHumanoValue('–'), true);
    assert.equal(isEmptyApoioHumanoValue('   '), true);
    assert.equal(isEmptyApoioHumanoValue('PCIU9479276'), false);
  });

  it('identifica Container Number pelo label', () => {
    const message = validateApoioHumanoSave([
      campo({ status: 'confirmado' }),
      campo({
        campoKey: 'container_number',
        campoLabel: 'Container Number',
        valorRecebido: '-',
        status: 'confirmado',
      }),
    ]);

    assert.equal(message, APOIO_HUMANO_SAVE_MESSAGES.containerNumberRequired);
  });

  it('bloqueia salvar com campo pendente', () => {
    const message = validateApoioHumanoSave([
      campo({ status: 'pendente' }),
      campo({
        campoKey: 'ContainerNumber',
        valorRecebido: 'PCIU9479276',
        status: 'confirmado',
      }),
    ]);

    assert.equal(message, APOIO_HUMANO_SAVE_MESSAGES.pendingCampos);
  });

  it('bloqueia ContainerNumber vazio mesmo confirmado', () => {
    const message = validateApoioHumanoSave([
      campo({ status: 'confirmado' }),
      campo({
        campoKey: 'ContainerNumber',
        valorRecebido: '-',
        status: 'confirmado',
      }),
    ]);

    assert.equal(message, APOIO_HUMANO_SAVE_MESSAGES.containerNumberRequired);
  });

  it('bloqueia ContainerNumber editado para vazio', () => {
    const message = validateApoioHumanoSave([
      campo({ status: 'confirmado' }),
      campo({
        campoKey: 'ContainerNumber',
        valorRecebido: '-',
        valorManual: '   ',
        status: 'editado',
      }),
    ]);

    assert.equal(message, APOIO_HUMANO_SAVE_MESSAGES.containerNumberRequired);
  });

  it('permite salvar quando todos estão confirmados e o container tem valor', () => {
    const message = validateApoioHumanoSave([
      campo({ status: 'confirmado' }),
      campo({
        campoKey: 'ContainerNumber',
        valorRecebido: '-',
        valorManual: 'PCIU9479276',
        status: 'editado',
      }),
    ]);

    assert.equal(message, null);
    assert.equal(
      resolveApoioHumanoCampoEffectiveValue({
        valorRecebido: '-',
        valorManual: 'PCIU9479276',
        status: 'editado',
      }),
      'PCIU9479276',
    );
  });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { __testing } from './client.js';

test('resolveNtlmDomain usa NetBIOS quando domain é FQDN', () => {
  assert.equal(__testing.resolveNtlmDomain('abainfra.local'), 'abainfra');
  assert.equal(__testing.resolveNtlmDomain('ABAINFRA'), 'ABAINFRA');
});

test('parseServerTarget separa host e instância nomeada', () => {
  const parsed = __testing.parseServerTarget('10.100.17.10\\FCA', 1433);

  assert.equal(parsed.server, '10.100.17.10');
  assert.equal(parsed.port, undefined);
  assert.equal(parsed.options?.instanceName, 'FCA');
});

test('parseServerTarget mantém host simples com porta', () => {
  const parsed = __testing.parseServerTarget('sql01.local', 1433);

  assert.equal(parsed.server, 'sql01.local');
  assert.equal(parsed.port, 1433);
});

test('resolveSqlLogin prefixa domínio quando necessário', () => {
  const login = __testing.resolveSqlLogin(
    'vinicius.ayres',
    'secret',
    'abainfra.local',
  );

  assert.equal(login.userName, 'abainfra.local\\vinicius.ayres');
  assert.equal(login.password, 'secret');
});

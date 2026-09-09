import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDatabaseUrl,
  buildMssqlConfig,
  escapeSqlServerValue,
  parseSqlServerTarget,
  resolveNtlmDomain,
  resolveSqlAuthMode,
} from './sql-server-connection.js';
import type { SqlServerConnectionConfig } from './sql-server-connection.js';

const ntlmNamedInstance: SqlServerConnectionConfig = {
  server: '10.100.17.10\\FCA',
  port: 1433,
  name: 'DB_OCR_FCA',
  domain: 'abainfra.local',
  authMode: 'ntlm',
  user: 'vinicius.ayres',
  password: 'secret',
  encrypt: false,
  trustServerCertificate: true,
  connectionTimeoutMs: 30000,
  requestTimeoutMs: 30000,
};

test('resolveNtlmDomain usa NetBIOS quando domain é FQDN', () => {
  assert.equal(resolveNtlmDomain('abainfra.local'), 'abainfra');
  assert.equal(resolveNtlmDomain('ABAINFRA'), 'ABAINFRA');
});

test('resolveSqlAuthMode usa NTLM quando o modo é ntlm ou há domínio', () => {
  assert.equal(resolveSqlAuthMode({ authMode: 'ntlm', domain: 'abainfra.local' }), 'ntlm');
  assert.equal(resolveSqlAuthMode({ authMode: '', domain: 'abainfra.local' }), 'ntlm');
  assert.equal(resolveSqlAuthMode({ authMode: 'sql', domain: 'abainfra.local' }), 'sql');
  assert.equal(resolveSqlAuthMode({ authMode: '', domain: '' }), 'sql');
});

test('parseSqlServerTarget separa host e instância nomeada e omite a porta', () => {
  const parsed = parseSqlServerTarget('10.100.17.10\\FCA', 1433);

  assert.equal(parsed.server, '10.100.17.10');
  assert.equal(parsed.port, undefined);
  assert.equal(parsed.options?.instanceName, 'FCA');
});

test('parseSqlServerTarget aceita servidor vazio ou indefinido', () => {
  assert.deepEqual(parseSqlServerTarget('', 1433), { server: '', port: 1433 });
  assert.equal(parseSqlServerTarget(undefined as unknown as string, 1433).server, '');
});

test('parseSqlServerTarget ignora barras duplicadas do dotenv', () => {
  const parsed = parseSqlServerTarget('10.100.17.10\\\\FCA', 1433);

  assert.equal(parsed.server, '10.100.17.10');
  assert.equal(parsed.port, undefined);
  assert.equal(parsed.options?.instanceName, 'FCA');
});

test('buildMssqlConfig replica NTLM e instância nomeada do GlobalSys', () => {
  const config = buildMssqlConfig(ntlmNamedInstance);

  assert.equal(config.server, '10.100.17.10');
  assert.equal(config.port, undefined);
  assert.equal(config.database, 'DB_OCR_FCA');
  assert.equal(config.authentication?.type, 'ntlm');
  assert.deepEqual(config.authentication?.options, {
    domain: 'abainfra',
    userName: 'vinicius.ayres',
    password: 'secret',
  });
  assert.equal(config.options?.instanceName, 'FCA');
  assert.equal(config.options?.trustedConnection, false);
});

test('buildDatabaseUrl omite a porta na instância nomeada e usa integratedSecurity no NTLM', () => {
  const url = buildDatabaseUrl(ntlmNamedInstance);

  assert.ok(url.startsWith('sqlserver://10.100.17.10\\FCA;'));
  assert.equal(url.includes(':1433'), false);
  assert.ok(url.includes('integratedSecurity=true'));
  assert.ok(url.includes(`user=${escapeSqlServerValue('abainfra\\vinicius.ayres')}`));
});

test('buildMssqlConfig rejeita NTLM com usuário sa', () => {
  assert.throws(
    () => buildMssqlConfig({ ...ntlmNamedInstance, user: 'sa' }),
    /NTLM não funciona com o usuário sa/,
  );
});

test('buildDatabaseUrl mantém host:porta e autenticação SQL', () => {
  const url = buildDatabaseUrl({
    ...ntlmNamedInstance,
    server: 'localhost',
    authMode: 'sql',
    domain: '',
    user: 'sa',
  });

  assert.ok(url.startsWith('sqlserver://localhost:1433;'));
  assert.equal(url.includes('integratedSecurity=true'), false);
  assert.ok(url.includes('user=sa;'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyGlobalSysInput,
  applyLdapInput,
  buildLdapUrl,
  parseLdapUrl,
  splitBindIdentity,
  mergeLdapRuntime,
  mergeGlobalSysRuntime,
} from './integration-config.mapper.js';
import type { LdapRuntimeConfig, GlobalSysRuntimeConfig } from '../types/integration.types.js';

test('parseLdapUrl extrai host, porta e TLS', () => {
  assert.deepEqual(parseLdapUrl('ldap://10.100.21.11:389'), {
    host: '10.100.21.11',
    port: 389,
    useTls: false,
  });
  assert.deepEqual(parseLdapUrl('ldaps://ad.empresa.local'), {
    host: 'ad.empresa.local',
    port: 636,
    useTls: true,
  });
  assert.equal(parseLdapUrl('10.100.21.11').host, '10.100.21.11');
});

test('buildLdapUrl monta URL a partir do host', () => {
  assert.equal(buildLdapUrl('10.100.21.11', 389, false), 'ldap://10.100.21.11:389');
  assert.equal(buildLdapUrl('ldap://10.100.21.11:389', 636, true), 'ldaps://10.100.21.11:636');
});

test('splitBindIdentity distingue DN e UPN', () => {
  assert.deepEqual(
    splitBindIdentity('CN=Service Abapass,OU=Serviços,DC=fcalog,DC=local'),
    {
      bindDn: 'CN=Service Abapass,OU=Serviços,DC=fcalog,DC=local',
      bindUpn: '',
    },
  );
  assert.deepEqual(splitBindIdentity('svc@fcalog.local'), {
    bindDn: '',
    bindUpn: 'svc@fcalog.local',
  });
});

test('mergeLdapRuntime ignora placeholder do seed e usa env', () => {
  const merged = mergeLdapRuntime({
    stored: {
      host: 'ad01.empresa.com.br',
      port: 389,
      baseDn: 'DC=empresa,DC=com,DC=br',
      bindDn: 'svc_ocr_bl',
    },
    preferStored: false,
  });

  assert.equal(merged.source, 'env');
  assert.notEqual(merged.config.host, 'ad01.empresa.com.br');
});

test('applyLdapInput preserva senha atual quando o campo vem vazio', () => {
  const current: LdapRuntimeConfig = {
    enabled: true,
    url: 'ldap://10.100.21.11:389',
    host: '10.100.21.11',
    port: 389,
    baseDn: 'DC=fcalog,DC=local',
    bindDn: 'CN=Service,DC=fcalog,DC=local',
    bindUpn: '',
    bindPassword: 'secret',
    useTls: false,
    groupPrefix: 'GG_OCR_BL_',
  };

  const next = applyLdapInput(current, {
    servidor: '10.100.21.12',
    porta: 389,
    password: '',
  });

  assert.equal(next.host, '10.100.21.12');
  assert.equal(next.bindPassword, 'secret');
});

test('applyGlobalSysInput atualiza host e preserva senha', () => {
  const current: GlobalSysRuntimeConfig = {
    enabled: true,
    server: '10.100.17.10\\FCA',
    port: 1433,
    name: 'NVOCCHOM',
    domain: 'abainfra.local',
    authMode: '',
    user: 'vinicius.ayres',
    password: 'secret',
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeoutMs: 30000,
    requestTimeoutMs: 30000,
  };

  const next = applyGlobalSysInput(current, {
    server: '10.100.17.11\\FCA',
    database: 'NVOCCHOM',
    password: '  ',
  });

  assert.equal(next.server, '10.100.17.11\\FCA');
  assert.equal(next.password, 'secret');
  assert.equal(next.name, 'NVOCCHOM');
});

test('mergeGlobalSysRuntime ignora placeholder do seed', () => {
  const merged = mergeGlobalSysRuntime({
    stored: {
      server: 'globalsys-sql01.empresa.local',
      name: 'GLOBALSYS_PROD',
      user: 'svc_globalsys_ro',
    },
    preferStored: true,
  });

  assert.equal(merged.source, 'env');
});

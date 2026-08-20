import '../src/config/env.js';

import { env } from '../src/config/env.js';
import { LDAP_AD_GROUPS } from '../src/config/ldap-groups.js';
import { ldapService, normalizeLogin } from '../src/services/ldap.service.js';

const testLogin = process.argv[2]?.trim();

async function main(): Promise<void> {
  console.log('=== Diagnóstico LDAP ComexBL ===\n');
  console.log('LDAP habilitado:', env.ldap.enabled);
  console.log('URL:', env.ldap.url || '(vazio)');
  console.log('Base DN:', env.ldap.baseDn || '(vazio)');
  console.log('Bind DN:', env.ldap.bindDn || '(vazio)');

  if (!env.ldap.enabled) {
    console.error('\nFALHA: LDAP não está habilitado. Verifique backend/.env e reinicie a API.');
    process.exit(1);
  }

  try {
    await ldapService.testConnection();
    console.log('\n[OK] Bind da service account');
  } catch (error) {
    console.error('\n[FALHA] Bind da service account:', error instanceof Error ? error.message : error);
    console.error('\nComo corrigir:');
    console.error('  1. Confirme a senha em LDAP_BIND_PASSWORD (use aspas se tiver % @ + ! etc.)');
    console.error('  2. Confirme o DN exato da conta (Get-ADUser service.abapass | Select DistinguishedName)');
    console.error('  3. Ou teste LDAP_BIND_UPN=conta@fcalog.local em vez de LDAP_BIND_DN');
    console.error('  4. Verifique se a conta não está bloqueada/desabilitada no AD');
    process.exit(1);
  }

  console.log('\nGrupos esperados no AD:');
  for (const group of LDAP_AD_GROUPS) {
    try {
      const found = await ldapService.findGroupByName(group.name);
      console.log(
        found
          ? `  [OK] ${group.name} -> ${found.dn}`
          : `  [FALHA] ${group.name} NÃO encontrado no AD`,
      );
    } catch (error) {
      console.error(
        `  [ERRO] ${group.name}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (!testLogin) {
    console.log('\nPara testar um usuário: npx tsx scripts/diagnose-ldap.ts <login>');
    return;
  }

  const normalized = normalizeLogin(testLogin);
  console.log(`\nUsuário informado: "${testLogin}" (normalizado: "${normalized}")`);

  try {
    const user = await ldapService.findUserByLogin(testLogin);
    if (!user) {
      console.error('[FALHA] Usuário não encontrado no AD via service account.');
      console.error('Verifique sAMAccountName, UPN e se o usuário está sob o Base DN.');
      process.exit(1);
    }

    console.log('[OK] Usuário encontrado');
    console.log('  DN:', user.dn);
    console.log('  Login:', user.login);
    console.log('  E-mail:', user.email);
    console.log('  Grupos (memberOf):', user.adGroupNames.length ? user.adGroupNames.join(', ') : '(nenhum GG_OCR_BL_* via memberOf)');

    const resolvedGroups = await ldapService.resolveAuthorizedGroupsForUser(user.login, user.dn);
    console.log('  Grupos (verificação por membership):', resolvedGroups.length ? resolvedGroups.join(', ') : '(nenhum)');

    if (resolvedGroups.length === 0) {
      console.warn('\n[AVISO] Usuário não pertence a nenhum grupo GG_OCR_BL_*.');
      console.warn('Confirme no AD que o CN do grupo é exatamente: GG_OCR_BL_ADMIN | GG_OCR_BL_SUPERVISOR | GG_OCR_BL_OPERADOR');
    } else {
      console.log('\n[OK] Usuário autorizado para login.');
    }
  } catch (error) {
    console.error('[ERRO] Busca do usuário:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

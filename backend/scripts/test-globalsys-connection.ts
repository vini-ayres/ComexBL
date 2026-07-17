import '../src/config/env.js';
import { env } from '../src/config/env.js';
import { checkGlobalSysConnection } from '../src/globalsys/client.js';

console.log('--- Diagnóstico GlobalSys ---');

if (!env.globalsys.enabled) {
  console.log('GlobalSys não configurado (GS_DB_* ausentes no .env)');
  process.exitCode = 1;
  process.exit();
}

console.log('Servidor:', `${env.globalsys.server}:${env.globalsys.port}`);
console.log('Banco:', env.globalsys.name);
console.log('Domínio:', env.globalsys.domain ?? '(não definido — SQL auth)');
console.log('Usuário:', env.globalsys.user);
console.log('encrypt:', env.globalsys.encrypt);
console.log('trustServerCertificate:', env.globalsys.trustServerCertificate);

const result = await checkGlobalSysConnection();

if (result.connected) {
  console.log(`Resultado: Conexão OK (${result.responseTimeMs}ms)`);
} else {
  console.error('Resultado: FALHA DE CONEXÃO');
  console.error(result.error);
  process.exitCode = 1;
}

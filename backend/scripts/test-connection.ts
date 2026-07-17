import '../src/config/env.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/prisma/client.js';

console.log('--- Diagnóstico de conexão ---');
console.log('Servidor:', `${env.database.server}:${env.database.port}`);
console.log('Banco:', env.database.name);
console.log('Senha carregada (tamanho):', env.database.password.length, 'caracteres');
console.log(
  'Formato na URL:',
  env.database.url.includes('password={') ? 'chaves {} (SQL Server)' : 'literal',
);
console.log('encrypt:', env.database.encrypt);
console.log('trustServerCertificate:', env.database.trustServerCertificate);
console.log(
  'URL (sem senha):',
  env.database.url.replace(/password=[^;]+/, 'password=***'),
);

try {
  const result = await prisma.$queryRaw`SELECT 1 AS ok`;
  console.log('Resultado: Conexão OK', result);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('certificate') || message.includes('SSL') || message.includes('TLS')) {
    console.error('Resultado: FALHA DE CRIPTOGRAFIA/SSL');
  } else if (message.includes('Authentication failed') || message.includes('logon')) {
    console.error('Resultado: FALHA DE AUTENTICAÇÃO (rede/SSL ok, usuário ou senha inválidos)');
  } else {
    console.error('Resultado: FALHA DE CONEXÃO');
  }

  console.error(message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

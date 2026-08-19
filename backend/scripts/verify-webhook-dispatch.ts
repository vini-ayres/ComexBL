import { env } from '../src/config/env.js';
import { prisma } from '../src/prisma/client.js';

async function main() {
  const masterId = 28;

  const [master, masterWf, houses] = await Promise.all([
    prisma.blMaster.findUnique({ where: { Id: masterId } }),
    prisma.blWorkflow.findFirst({ where: { BlMasterId: masterId } }),
    prisma.blHouse.findMany({
      where: { BLMasterId: masterId },
      orderBy: { HouseNumber: 'asc' },
    }),
  ]);

  console.log('=== Estado do lote ===');
  console.log(
    JSON.stringify(
      {
        master: master
          ? {
              id: master.Id,
              number: master.MasterNumber,
              container: master.ContainerNumber,
              blVersion: master.BlVersion,
              hblCount: master.HBLCount,
            }
          : null,
        houseCount: houses.length,
        houses: houses.map((house) => ({
          id: house.Id,
          number: house.HouseNumber,
          container: house.ContainerNumber,
        })),
        masterWorkflow: masterWf?.Status ?? null,
        masterFinalizedAt: masterWf?.UpdatedAt?.toISOString() ?? null,
      },
      null,
      2,
    ),
  );

  const ready =
    Boolean(master?.ContainerNumber?.trim()) &&
    masterWf?.Status === 'finalizado' &&
    master?.HBLCount != null &&
    houses.length === master.HBLCount;

  console.log('\nPronto para webhook consolidado:', ready ? 'SIM' : 'NAO');

  if (!env.n8n.webhookEnviarXmlGlobalsysUrl) {
    console.log('Webhook URL não configurada.');
    return;
  }

  console.log('\n=== Teste de conectividade (POST de verificação) ===');
  console.log('URL:', env.n8n.webhookEnviarXmlGlobalsysUrl);
  console.log('Payload:', JSON.stringify({ masterId }));

  try {
    const started = Date.now();
    const response = await fetch(env.n8n.webhookEnviarXmlGlobalsysUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ masterId }),
    });
    const body = await response.text().catch(() => '');
    console.log('HTTP status:', response.status, response.statusText);
    console.log('Tempo ms:', Date.now() - started);
    console.log('Resposta:', body.slice(0, 500) || '(vazio)');
  } catch (error) {
    console.error('Falha ao chamar webhook:', error);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

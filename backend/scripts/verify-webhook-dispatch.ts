import { env } from '../src/config/env.js';
import { prisma } from '../src/prisma/client.js';

async function main() {
  const masterId = 28;
  const houseId = 82;

  const [master, house, masterWf, houseWf] = await Promise.all([
    prisma.blMaster.findUnique({ where: { Id: masterId } }),
    prisma.blHouse.findUnique({ where: { Id: houseId } }),
    prisma.blWorkflow.findFirst({ where: { BlMasterId: masterId } }),
    prisma.blWorkflow.findFirst({ where: { BlHouseId: houseId } }),
  ]);

  console.log('=== Estado do par ===');
  console.log(
    JSON.stringify(
      {
        master: master
          ? {
              id: master.Id,
              number: master.MasterNumber,
              container: master.ContainerNumber,
              blVersion: master.BlVersion,
            }
          : null,
        house: house
          ? {
              id: house.Id,
              number: house.HouseNumber,
              container: house.ContainerNumber,
              blMasterId: house.BLMasterId,
              blVersion: house.BlVersion,
            }
          : null,
        masterWorkflow: masterWf?.Status ?? null,
        houseWorkflow: houseWf?.Status ?? null,
        masterFinalizedAt: masterWf?.UpdatedAt?.toISOString() ?? null,
        houseFinalizedAt: houseWf?.UpdatedAt?.toISOString() ?? null,
      },
      null,
      2,
    ),
  );

  const ready =
    master?.ContainerNumber?.trim() &&
    house?.ContainerNumber?.trim() &&
    master.ContainerNumber === house.ContainerNumber &&
    house.BLMasterId === master.Id &&
    masterWf?.Status === 'finalizado' &&
    houseWf?.Status === 'finalizado';

  console.log('\nPronto para webhook:', ready ? 'SIM' : 'NAO');

  if (!env.n8n.webhookEnviarXmlGlobalsysUrl) {
    console.log('Webhook URL não configurada.');
    return;
  }

  console.log('\n=== Teste de conectividade (POST de verificação) ===');
  console.log('URL:', env.n8n.webhookEnviarXmlGlobalsysUrl);
  console.log('Payload:', JSON.stringify({ houseId, masterId }));

  try {
    const started = Date.now();
    const response = await fetch(env.n8n.webhookEnviarXmlGlobalsysUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ houseId, masterId }),
    });
    const body = await response.text().catch(() => '');
    console.log('HTTP status:', response.status, response.statusText);
    console.log('Tempo ms:', Date.now() - started);
    console.log('Resposta:', body.slice(0, 500) || '(vazio)');
    console.log(
      '\nNota: este POST é um reenvio de verificação manual — confira no n8n se já havia execução por volta de',
      houseWf?.UpdatedAt?.toISOString() ?? 'N/A',
    );
  } catch (error) {
    console.error('Falha ao chamar webhook:', error);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

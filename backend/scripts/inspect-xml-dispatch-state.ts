import { prisma } from '../src/prisma/client.js';
import { env } from '../src/config/env.js';

async function main() {
  const webhookConfigured = Boolean(env.n8n.webhookEnviarXmlGlobalsysUrl);
  console.log('Webhook URL configurada:', webhookConfigured ? env.n8n.webhookEnviarXmlGlobalsysUrl : '(não)');

  const finalizedWorkflows = await prisma.blWorkflow.findMany({
    where: { Status: 'finalizado' },
    orderBy: { UpdatedAt: 'desc' },
    take: 10,
    include: {
      master: {
        select: {
          Id: true,
          MasterNumber: true,
          BlVersion: true,
          ContainerNumber: true,
        },
      },
      house: {
        select: {
          Id: true,
          HouseNumber: true,
          BlVersion: true,
          ContainerNumber: true,
          BLMasterId: true,
        },
      },
    },
  });

  console.log('\n--- Workflows finalizados (últimos 10) ---');
  for (const w of finalizedWorkflows) {
    if (w.master) {
      console.log(
        JSON.stringify({
          tipo: 'Master',
          workflowId: w.Id,
          masterId: w.master.Id,
          numero: w.master.MasterNumber,
          blVersion: w.master.BlVersion,
          container: w.master.ContainerNumber,
          updatedAt: w.UpdatedAt.toISOString(),
          pendencia: w.Pendencia,
        }),
      );
    }
    if (w.house) {
      console.log(
        JSON.stringify({
          tipo: 'House',
          workflowId: w.Id,
          houseId: w.house.Id,
          numero: w.house.HouseNumber,
          blVersion: w.house.BlVersion,
          container: w.house.ContainerNumber,
          blMasterId: w.house.BLMasterId,
          updatedAt: w.UpdatedAt.toISOString(),
          pendencia: w.Pendencia,
        }),
      );
    }
  }

  const recentPairs = await prisma.$queryRaw<
    Array<{
      masterId: number;
      masterNumber: string;
      houseId: number;
      houseNumber: string;
      blVersion: string;
      containerNumber: string | null;
      masterWorkflowStatus: string | null;
      houseWorkflowStatus: string | null;
      blMasterId: number | null;
    }>
  >`
    SELECT TOP 20
      m.Id AS masterId,
      m.MasterNumber AS masterNumber,
      h.Id AS houseId,
      h.HouseNumber AS houseNumber,
      m.BlVersion AS blVersion,
      m.ContainerNumber AS containerNumber,
      wm.Status AS masterWorkflowStatus,
      wh.Status AS houseWorkflowStatus,
      h.BLMasterId AS blMasterId
    FROM BL_Master m
    INNER JOIN BL_House h
      ON h.ContainerNumber = m.ContainerNumber
      AND h.BlVersion = m.BlVersion
    LEFT JOIN BL_Workflow wm ON wm.BlMasterId = m.Id
    LEFT JOIN BL_Workflow wh ON wh.BlHouseId = h.Id
    ORDER BY COALESCE(wm.UpdatedAt, wh.UpdatedAt) DESC
  `;

  console.log('\n--- Pares Master/House por container (últimos 20) ---');
  for (const pair of recentPairs) {
    const wouldDispatch =
      pair.masterWorkflowStatus === 'finalizado' &&
      pair.houseWorkflowStatus === 'finalizado' &&
      pair.containerNumber?.trim();

    console.log(
      JSON.stringify({
        ...pair,
        wouldDispatchWebhook: wouldDispatch,
        linked: pair.blMasterId === pair.masterId,
      }),
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

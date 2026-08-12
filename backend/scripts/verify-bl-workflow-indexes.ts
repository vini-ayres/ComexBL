import { prisma } from '../src/prisma/client.js';
import { blWorkflowRepository } from '../src/repositories/bl-workflow.repository.js';

const indexes = await prisma.$queryRawUnsafe<Array<{
  name: string;
  is_unique: boolean;
  filter_definition: string | null;
}>>(
  `SELECT i.name, i.is_unique, i.filter_definition
   FROM sys.indexes i
   WHERE i.object_id = OBJECT_ID(N'dbo.BL_Workflow')
     AND i.name IN ('UQ_BL_Workflow_BlMasterId', 'UQ_BL_Workflow_BlHouseId')
   ORDER BY i.name`,
);

console.log('=== BL_Workflow filtered indexes ===');
console.log(JSON.stringify(indexes, null, 2));

const master = await prisma.blMaster.findUnique({ where: { Id: 15 } });
if (!master) {
  console.log('Master 15 not found — skipping upsert test');
  await prisma.$disconnect();
  process.exit(0);
}

const created = await blWorkflowRepository.upsert({
  tipoBl: 'Master',
  blMasterId: master.Id,
  documentNumber: master.MasterNumber,
  data: {
    status: 'apoio_humano',
    pendencia: 'teste migration filtered index',
    confianca: 80,
    responsavelUserId: null,
  },
});

console.log('=== upsert master 15 OK ===', {
  id: created.Id,
  BlMasterId: created.BlMasterId,
  Status: created.Status,
});

await prisma.blWorkflow.delete({ where: { Id: created.Id } });
console.log('=== cleanup test row OK ===');
await prisma.$disconnect();

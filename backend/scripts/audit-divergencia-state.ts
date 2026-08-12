import { prisma } from '../src/prisma/client.js';

const houses = await prisma.blHouse.findMany({
  select: {
    Id: true,
    HouseNumber: true,
    BlVersion: true,
    BLMasterId: true,
  },
  orderBy: [{ HouseNumber: 'asc' }, { BlVersion: 'asc' }],
});

console.log('=== BL_House ===');
console.log(JSON.stringify(houses, null, 2));

const masters = await prisma.blMaster.findMany({
  orderBy: [{ MasterNumber: 'asc' }, { BlVersion: 'asc' }],
  select: {
    Id: true,
    MasterNumber: true,
    BlVersion: true,
    VesselName: true,
    Status: true,
  },
});

const workflows = await prisma.blWorkflow.findMany({
  select: {
    Id: true,
    BlMasterId: true,
    BlHouseId: true,
    TipoBl: true,
    Status: true,
    Pendencia: true,
  },
});

const divergencias = await prisma.blDivergencia.findMany({
  include: {
    campos: {
      select: { Id: true, CampoKey: true, Status: true },
    },
  },
  orderBy: { CreatedAt: 'desc' },
});

console.log('=== BL_Master (DRAFT/FINAL pairs) ===');
console.log(JSON.stringify(masters, null, 2));
console.log('=== BL_Workflow ===');
console.log(JSON.stringify(workflows, null, 2));
console.log('=== BL_Divergencia ===');
console.log(
  JSON.stringify(
    divergencias.map((d) => ({
      Id: d.Id,
      BlMasterId: d.BlMasterId,
      BlHouseId: d.BlHouseId,
      Status: d.Status,
      camposCount: d.campos.length,
      sampleCampos: d.campos.slice(0, 3).map((c) => c.CampoKey),
    })),
    null,
    2,
  ),
);

await prisma.$disconnect();

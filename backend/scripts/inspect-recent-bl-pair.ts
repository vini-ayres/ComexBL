import { prisma } from '../src/prisma/client.js';

async function main() {
  const master = await prisma.blMaster.findUnique({ where: { Id: 26 } });
  const house = await prisma.blHouse.findUnique({ where: { Id: 80 } });

  console.log('Master 26:', {
    masterNumber: master?.MasterNumber,
    containerNumber: master?.ContainerNumber,
    blVersion: master?.BlVersion,
  });

  console.log('House 80:', {
    houseNumber: house?.HouseNumber,
    containerNumber: house?.ContainerNumber,
    blMasterId: house?.BLMasterId,
    blVersion: house?.BlVersion,
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

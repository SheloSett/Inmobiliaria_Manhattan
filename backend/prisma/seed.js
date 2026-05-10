const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.admin.upsert({
    where: { email: 'admin@manhattan.com' },
    update: {},
    create: {
      email: 'admin@manhattan.com',
      password: hashedPassword,
      name: 'Administrador',
    },
  });

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      siteName: 'Inmobiliaria Manhattan',
      phone: '+54 11 0000-0000',
      whatsapp: '5491100000000',
      email: 'contacto@manhattan.com',
      address: 'Buenos Aires, Argentina',
    },
  });

  console.log('Seed completado');
  console.log('Admin: admin@manhattan.com / admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

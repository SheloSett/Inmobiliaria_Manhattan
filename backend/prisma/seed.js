const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // const hashedPassword = await bcrypt.hash('admin123', 10);
  //
  // await prisma.admin.upsert({
  //   where: { email: 'admin@manhattan.com' },
  //   update: {},
  //   create: {
  //     email: 'admin@manhattan.com',
  //     password: hashedPassword,
  //     name: 'Administrador',
  //   },
  // });
  //
  // ↑ Comentado (11/08/2026). El upsert buscaba por EMAIL, y eso reabría un agujero justo
  //   en el peor momento: al entregarle la web al cliente se le cambia el email del admin
  //   desde Ajustes → Perfil, con lo cual `admin@manhattan.com` deja de existir. Como el
  //   seed corre en CADA arranque del contenedor (ver el CMD del Dockerfile), en el
  //   siguiente `docker compose up --build` volvía a CREAR ese admin con la contraseña
  //   'admin123' — que está publicada en este repo (es público). Quedaban dos admins: el
  //   del cliente y uno fantasma con credenciales conocidas, sin que nadie lo notara.
  //
  //   Ahora el criterio es "¿hay AL MENOS UN admin?" en vez de "¿existe este email?": el
  //   seed solo crea el admin inicial en una base vacía (primer despliegue). Una vez que
  //   existe cualquier admin, no vuelve a tocar nada aunque le cambien el email.
  const adminCount = await prisma.admin.count();
  if (adminCount === 0) {
    // Contraseña inicial solo para el primer arranque de una base vacía. Se puede fijar
    // por variable de entorno (ADMIN_PASSWORD) al desplegar; si no viene, se usa la de
    // siempre y se avisa fuerte por consola para que se cambie antes de publicar.
    const initialPassword = process.env.ADMIN_PASSWORD || 'admin123';
    await prisma.admin.create({
      data: {
        email: process.env.ADMIN_EMAIL || 'admin@manhattan.com',
        password: await bcrypt.hash(initialPassword, 10),
        name: 'Administrador',
      },
    });
    if (!process.env.ADMIN_PASSWORD) {
      console.warn('⚠  Admin creado con la contraseña por defecto (admin123). CAMBIALA antes de publicar el sitio.');
    }
  }

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

  // --- Catálogos por defecto (gestionables luego desde Ajustes → Catálogos) ---
  // Se hace upsert por `value`, así el seed es idempotente y NO pisa ediciones/altas
  // que el admin haya hecho (solo garantiza que existan estos valores base). Los
  // `value` replican los enums originales para que las propiedades ya cargadas sigan
  // resolviendo su etiqueta.
  const operationTypes = [
    { value: 'SALE', label: 'Venta', order: 0 },
    { value: 'RENT', label: 'Alquiler', order: 1 },
  ];
  for (const op of operationTypes) {
    await prisma.operationType.upsert({ where: { value: op.value }, update: {}, create: op });
  }

  const propertyTypes = [
    { value: 'APARTMENT', label: 'Departamento', order: 0 },
    { value: 'HOUSE', label: 'Casa', order: 1 },
    { value: 'OFFICE', label: 'Oficina', order: 2 },
    { value: 'LOCAL', label: 'Local', order: 3 },
    { value: 'LAND', label: 'Terreno', order: 4 },
    { value: 'PH', label: 'PH', order: 5 },
  ];
  for (const t of propertyTypes) {
    await prisma.propertyTypeOption.upsert({ where: { value: t.value }, update: {}, create: t });
  }

  // Amenities por defecto (los del template admin_create_Properties). `icon` usa
  // nombres de Material Symbols para poder mostrarlos con ícono en la ficha pública.
  const amenities = [
    { value: 'ELEVATOR', label: 'Ascensor', icon: 'elevator', order: 0 },
    { value: 'TERRACE', label: 'Terraza', icon: 'deck', order: 1 },
    { value: 'SUM', label: 'SUM', icon: 'celebration', order: 2 },
    { value: 'GYM', label: 'Gimnasio', icon: 'fitness_center', order: 3 },
    { value: 'POOL', label: 'Piscina', icon: 'pool', order: 4 },
    { value: 'SECURITY', label: 'Seguridad 24hs', icon: 'security', order: 5 },
    { value: 'GRILL', label: 'Parrilla', icon: 'outdoor_grill', order: 6 },
    { value: 'PETS', label: 'Apto Mascotas', icon: 'pets', order: 7 },
  ];
  for (const a of amenities) {
    await prisma.amenity.upsert({ where: { value: a.value }, update: {}, create: a });
  }

  console.log('Seed completado');
  // console.log('Admin: admin@manhattan.com / admin123');
  // ↑ Comentado: imprimía las credenciales en cada arranque, aunque el admin ya existiera
  //   y tuviera otra contraseña. Además de ser información engañosa, dejaba la contraseña
  //   por defecto escrita en los logs del contenedor (`docker compose logs`), que es un
  //   lugar más donde queda expuesta. Ahora solo se avisa cuando REALMENTE se creó un
  //   admin nuevo con la contraseña por defecto (ver el warning de arriba).
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

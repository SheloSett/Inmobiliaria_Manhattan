const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.get = async (req, res) => {
  try {
    const settings = await prisma.siteSettings.findFirst();
    res.json(settings || {});
  } catch {
    res.status(500).json({ error: 'Error al obtener ajustes' });
  }
};

exports.update = async (req, res) => {
  try {
    const { siteName, phone, whatsapp, email, address, instagram, facebook, googleMapsKey } = req.body;
    const settings = await prisma.siteSettings.upsert({
      where: { id: 1 },
      update: { siteName, phone, whatsapp, email, address, instagram, facebook, googleMapsKey },
      create: { siteName, phone, whatsapp, email, address, instagram, facebook, googleMapsKey },
    });
    res.json(settings);
  } catch {
    res.status(500).json({ error: 'Error al actualizar ajustes' });
  }
};

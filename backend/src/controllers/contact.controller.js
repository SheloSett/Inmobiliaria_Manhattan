const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.create = async (req, res) => {
  try {
    const { name, email, phone, message, propertyId } = req.body;
    const contact = await prisma.contact.create({
      data: { name, email, phone, message, propertyId: propertyId ? Number(propertyId) : null },
    });
    res.status(201).json(contact);
  } catch {
    res.status(500).json({ error: 'Error al enviar consulta' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { read, page = 1, limit = 20 } = req.query;
    const where = {};
    if (read !== undefined) where.read = read === 'true';

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: { property: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.contact.count({ where }),
    ]);

    res.json({ contacts, total });
  } catch {
    res.status(500).json({ error: 'Error al obtener consultas' });
  }
};

exports.markRead = async (req, res) => {
  try {
    await prisma.contact.update({ where: { id: Number(req.params.id) }, data: { read: true } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al actualizar consulta' });
  }
};

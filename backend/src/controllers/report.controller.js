const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.getDashboard = async (req, res) => {
  try {
    const [
      totalProperties,
      availableProperties,
      reservedProperties,
      soldProperties,
      rentedProperties,
      totalContacts,
      unreadContacts,
      recentContacts,
      propertiesByType,
      propertiesByOperation,
    ] = await Promise.all([
      prisma.property.count(),
      prisma.property.count({ where: { status: 'AVAILABLE' } }),
      prisma.property.count({ where: { status: 'RESERVED' } }),
      prisma.property.count({ where: { status: 'SOLD' } }),
      prisma.property.count({ where: { status: 'RENTED' } }),
      prisma.contact.count(),
      prisma.contact.count({ where: { read: false } }),
      prisma.contact.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { property: { select: { title: true } } },
      }),
      prisma.property.groupBy({ by: ['type'], _count: true }),
      prisma.property.groupBy({ by: ['operation'], _count: true }),
    ]);

    res.json({
      properties: { total: totalProperties, available: availableProperties, reserved: reservedProperties, sold: soldProperties, rented: rentedProperties },
      contacts: { total: totalContacts, unread: unreadContacts, recent: recentContacts },
      charts: { byType: propertiesByType, byOperation: propertiesByOperation },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener métricas' });
  }
};

exports.getByRange = async (req, res) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from) : new Date(new Date().setDate(1));
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);

    const [newProperties, newContacts, soldInRange, propertiesByDay, contactsByDay] = await Promise.all([
      prisma.property.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.contact.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.property.count({ where: { status: { in: ['SOLD', 'RENTED'] }, updatedAt: { gte: start, lte: end } } }),
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM "Property"
        WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM "Contact"
        WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
    ]);

    res.json({
      range: { from: start, to: end },
      newProperties,
      newContacts,
      soldInRange,
      charts: { propertiesByDay, contactsByDay },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
};

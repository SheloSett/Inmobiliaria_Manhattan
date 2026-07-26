const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Adjunta a cada propiedad las etiquetas legibles de su operación y tipo, buscándolas
// en los catálogos (operation/type son `value`, ej "SALE"). Así las páginas públicas
// muestran el label ("Venta") sin tener que resolverlo, y siguen usando el `value`
// para la lógica (color, "/mes", etc.). Si el value no está en el catálogo (porque se
// borró), cae al propio value como fallback.
async function withCatalogLabels(properties) {
  const [ops, types] = await Promise.all([
    prisma.operationType.findMany(),
    prisma.propertyTypeOption.findMany(),
  ]);
  const opMap = Object.fromEntries(ops.map((o) => [o.value, o.label]));
  const typeMap = Object.fromEntries(types.map((t) => [t.value, t.label]));
  const list = Array.isArray(properties) ? properties : [properties];
  const enriched = list.map((p) => ({
    ...p,
    operationLabel: opMap[p.operation] || p.operation,
    typeLabel: typeMap[p.type] || p.type,
  }));
  return Array.isArray(properties) ? enriched : enriched[0];
}

// Parsea los ids de amenities que llegan del form (JSON string en multipart, o array).
function parseAmenityIds(raw) {
  if (!raw) return [];
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr.map(Number).filter((n) => !Number.isNaN(n)) : [];
  } catch {
    return [];
  }
}

exports.getAll = async (req, res) => {
  try {
    const { operation, type, status, featured, search, page = 1, limit = 12 } = req.query;
    const where = {};
    if (operation) where.operation = operation;
    if (type) where.type = type;
    if (status) where.status = status;
    if (featured !== undefined) where.featured = featured === 'true';
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { neighborhood: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
    ];

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          images: { orderBy: { order: 'asc' } },
          amenities: { orderBy: { order: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.property.count({ where }),
    ]);

    res.json({ properties: await withCatalogLabels(properties), total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener propiedades' });
  }
};

exports.getById = async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        images: { orderBy: { order: 'asc' } },
        amenities: { orderBy: { order: 'asc' } },
      },
    });
    if (!property) return res.status(404).json({ error: 'Propiedad no encontrada' });
    res.json(await withCatalogLabels(property));
  } catch {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      title, description, price, currency, operation, type, status,
      bedrooms, bathrooms, area, garage, address, city, neighborhood,
      lat, lng, featured, amenityIds,
    } = req.body;

    const ids = parseAmenityIds(amenityIds);
    const property = await prisma.property.create({
      data: {
        title, description,
        price: parseFloat(price),
        currency: currency || 'USD',
        operation,
        type,
        status: status || 'AVAILABLE',
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        area: area ? parseFloat(area) : null,
        garage: garage === 'true' || garage === true,
        address, city,
        neighborhood: neighborhood || null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        featured: featured === 'true' || featured === true,
        ...(ids.length ? { amenities: { connect: ids.map((id) => ({ id })) } } : {}),
      },
    });

    if (req.files?.length) {
      await prisma.propertyImage.createMany({
        data: req.files.map((f, i) => ({
          url: `/uploads/properties/${f.filename}`,
          isPrimary: i === 0,
          order: i,
          propertyId: property.id,
        })),
      });
    }

    const full = await prisma.property.findUnique({
      where: { id: property.id },
      include: { images: true, amenities: { orderBy: { order: 'asc' } } },
    });
    res.status(201).json(await withCatalogLabels(full));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear propiedad' });
  }
};

exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      title, description, price, currency, operation, type, status,
      bedrooms, bathrooms, area, garage, address, city, neighborhood,
      lat, lng, featured, deleteImages, amenityIds,
    } = req.body;

    const data = {};
    // Amenities: si vino el campo, se reemplaza el set completo (marca/desmarca).
    if (amenityIds !== undefined) {
      data.amenities = { set: parseAmenityIds(amenityIds).map((aid) => ({ id: aid })) };
    }
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = parseFloat(price);
    if (currency !== undefined) data.currency = currency;
    if (operation !== undefined) data.operation = operation;
    if (type !== undefined) data.type = type;
    if (status !== undefined) data.status = status;
    if (bedrooms !== undefined) data.bedrooms = bedrooms ? parseInt(bedrooms) : null;
    if (bathrooms !== undefined) data.bathrooms = bathrooms ? parseInt(bathrooms) : null;
    if (area !== undefined) data.area = area ? parseFloat(area) : null;
    if (garage !== undefined) data.garage = garage === 'true' || garage === true;
    if (address !== undefined) data.address = address;
    if (city !== undefined) data.city = city;
    if (neighborhood !== undefined) data.neighborhood = neighborhood;
    if (lat !== undefined) data.lat = lat ? parseFloat(lat) : null;
    if (lng !== undefined) data.lng = lng ? parseFloat(lng) : null;
    if (featured !== undefined) data.featured = featured === 'true' || featured === true;

    if (deleteImages) {
      const ids = JSON.parse(deleteImages);
      await prisma.propertyImage.deleteMany({ where: { id: { in: ids } } });
    }

    if (req.files?.length) {
      const existing = await prisma.propertyImage.count({ where: { propertyId: id } });
      await prisma.propertyImage.createMany({
        data: req.files.map((f, i) => ({
          url: `/uploads/properties/${f.filename}`,
          isPrimary: existing === 0 && i === 0,
          order: existing + i,
          propertyId: id,
        })),
      });
    }

    const property = await prisma.property.update({
      where: { id },
      data,
      include: {
        images: { orderBy: { order: 'asc' } },
        amenities: { orderBy: { order: 'asc' } },
      },
    });
    res.json(await withCatalogLabels(property));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar propiedad' });
  }
};

exports.remove = async (req, res) => {
  try {
    await prisma.property.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar propiedad' });
  }
};

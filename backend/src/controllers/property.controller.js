const { PrismaClient } = require('@prisma/client');
const presence = require('../services/presence.service');

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

// Recalcula la portada (isPrimary) de una propiedad: la primera FOTO según el `order`
// pasa a ser portada (los videos no sirven de miniatura). Si solo hay videos, ninguna
// queda como portada. Se llama tras crear/reordenar/eliminar media para dejarla consistente.
async function recomputePrimary(propertyId) {
  const imgs = await prisma.propertyImage.findMany({
    where: { propertyId },
    orderBy: { order: 'asc' },
  });
  const cover = imgs.find((i) => i.type !== 'video');
  await Promise.all(
    imgs.map((i) =>
      prisma.propertyImage.update({
        where: { id: i.id },
        data: { isPrimary: cover ? i.id === cover.id : false },
      })
    )
  );
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
    // Loguea la vista solo cuando viene de la ficha pública (?src=public). El admin
    // llama a este mismo endpoint para precargar el formulario de edición y esa
    // carga no debe contar como una vista real. Agregado 28/07/2026 para las
    // métricas de "propiedades más vistas" del dashboard.
    if (req.query.src === 'public') {
      await prisma.propertyEvent.create({ data: { propertyId: property.id, type: 'VIEW' } });
    }
    res.json(await withCatalogLabels(property));
  } catch {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// Heartbeat de presencia (28/07/2026): la ficha pública lo llama cada ~20s mientras
// está abierta, para que el dashboard admin pueda mostrar "quién está viendo qué
// propiedad ahora". Público (sin auth), no toca la base de datos.
exports.trackHeartbeat = (req, res) => {
  const propertyId = Number(req.params.id);
  const sessionId = String(req.body?.sessionId || '');
  if (!sessionId) return res.status(400).json({ error: 'Falta sessionId' });
  presence.ping(propertyId, sessionId);
  res.status(204).end();
};

// Clic en "Consultar por WhatsApp" (botón rápido o submit del formulario) desde la
// ficha pública. Público (sin auth), alimenta "propiedades más consultadas" en el
// dashboard admin. Agregado 28/07/2026.
exports.trackContactClick = async (req, res) => {
  try {
    await prisma.propertyEvent.create({ data: { propertyId: Number(req.params.id), type: 'CONTACT_CLICK' } });
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// Propiedades siendo vistas ahora mismo, para el panel "Viendo ahora" del dashboard
// admin. Requiere auth. Agregado 28/07/2026.
exports.getLive = async (req, res) => {
  try {
    const live = presence.getLive();
    if (live.length === 0) return res.json([]);
    const properties = await prisma.property.findMany({
      where: { id: { in: live.map((l) => l.propertyId) } },
      select: { id: true, title: true, address: true, city: true },
    });
    const byId = Object.fromEntries(properties.map((p) => [p.id, p]));
    const result = live
      .filter((l) => byId[l.propertyId])
      .map((l) => ({ ...byId[l.propertyId], viewers: l.viewers }));
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      title, description, price, currency, operation, type, status,
      bedrooms, bathrooms, area, garage, hasKey, address, city, neighborhood,
      lat, lng, featured, amenityIds, expenses, expensesCurrency,
    } = req.body;

    const ids = parseAmenityIds(amenityIds);
    const property = await prisma.property.create({
      data: {
        title, description,
        price: parseFloat(price),
        currency: currency || 'USD',
        // Expensas: monto opcional (null si viene vacío) + su moneda (default ARS).
        expenses: expenses ? parseFloat(expenses) : null,
        expensesCurrency: expensesCurrency || 'ARS',
        operation,
        type,
        status: status || 'AVAILABLE',
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        area: area ? parseFloat(area) : null,
        garage: garage === 'true' || garage === true,
        hasKey: hasKey === 'true' || hasKey === true,
        address, city,
        neighborhood: neighborhood || null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        featured: featured === 'true' || featured === true,
        ...(ids.length ? { amenities: { connect: ids.map((id) => ({ id })) } } : {}),
      },
    });

    if (req.files?.length) {
      // isPrimary: se marca como principal la primera FOTO (no un video), porque los
      // listados usan esa imagen como miniatura. Si solo hay videos, ninguna es primary.
      const firstImageIdx = req.files.findIndex((f) => !f.mimetype.startsWith('video/'));
      await prisma.propertyImage.createMany({
        data: req.files.map((f, i) => ({
          // url: `/uploads/properties/${f.filename}`,
          // ↑ Comentado: ya no se guarda localmente. Con CloudinaryStorage,
          //   `f.path` trae la URL completa (https://res.cloudinary.com/...)
          //   del archivo ya subido a la cuenta de Cloudinary.
          url: f.path,
          type: f.mimetype.startsWith('video/') ? 'video' : 'image',
          isPrimary: i === firstImageIdx,
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
      bedrooms, bathrooms, area, garage, hasKey, address, city, neighborhood,
      lat, lng, featured, deleteImages, amenityIds, imageOrder,
      expenses, expensesCurrency,
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
    if (expenses !== undefined) data.expenses = expenses ? parseFloat(expenses) : null;
    if (expensesCurrency !== undefined) data.expensesCurrency = expensesCurrency || 'ARS';
    if (operation !== undefined) data.operation = operation;
    if (type !== undefined) data.type = type;
    if (status !== undefined) data.status = status;
    if (bedrooms !== undefined) data.bedrooms = bedrooms ? parseInt(bedrooms) : null;
    if (bathrooms !== undefined) data.bathrooms = bathrooms ? parseInt(bathrooms) : null;
    if (area !== undefined) data.area = area ? parseFloat(area) : null;
    if (garage !== undefined) data.garage = garage === 'true' || garage === true;
    if (hasKey !== undefined) data.hasKey = hasKey === 'true' || hasKey === true;
    if (address !== undefined) data.address = address;
    if (city !== undefined) data.city = city;
    if (neighborhood !== undefined) data.neighborhood = neighborhood;
    if (lat !== undefined) data.lat = lat ? parseFloat(lat) : null;
    if (lng !== undefined) data.lng = lng ? parseFloat(lng) : null;
    if (featured !== undefined) data.featured = featured === 'true' || featured === true;

    // 1) Eliminar las marcadas para borrar.
    if (deleteImages) {
      const ids = JSON.parse(deleteImages);
      await prisma.propertyImage.deleteMany({ where: { id: { in: ids } } });
    }

    // 2) Reordenar la media existente según imageOrder (array de ids en el nuevo orden,
    //    tal como quedó tras arrastrarlas en el admin). El índice pasa a ser el `order`.
    let orderedIds = [];
    if (imageOrder) {
      try { orderedIds = JSON.parse(imageOrder).map(Number).filter((n) => !Number.isNaN(n)); } catch { orderedIds = []; }
    }
    if (orderedIds.length) {
      await Promise.all(
        orderedIds.map((imgId, idx) =>
          prisma.propertyImage.update({ where: { id: imgId }, data: { order: idx } }).catch(() => {})
        )
      );
    }

    // 3) Media nueva: se agrega al final (después de las existentes reordenadas).
    if (req.files?.length) {
      const base = orderedIds.length || await prisma.propertyImage.count({ where: { propertyId: id } });
      await prisma.propertyImage.createMany({
        data: req.files.map((f, i) => ({
          // url: `/uploads/properties/${f.filename}`,
          // ↑ Comentado: ver explicación en create() más arriba — ahora se usa
          //   la URL de Cloudinary devuelta en `f.path`.
          url: f.path,
          type: f.mimetype.startsWith('video/') ? 'video' : 'image',
          order: base + i,
          propertyId: id,
          // isPrimary se recalcula abajo con recomputePrimary (según el orden final).
        })),
      });
    }

    // 4) Recalcular la portada según el orden final (primera foto = portada).
    await recomputePrimary(id);

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

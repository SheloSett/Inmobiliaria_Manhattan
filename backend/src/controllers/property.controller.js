const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const cloudinary = require('../config/cloudinary');
const presence = require('../services/presence.service');

const prisma = new PrismaClient();

// Valores válidos del campo "llave" (ver keyStatus en schema.prisma).
const KEY_STATUS_VALUES = ['WITH', 'WITHOUT', 'HIDDEN'];

// Borra de Cloudinary los archivos que multer YA subió, cuando la request termina
// rechazada antes de guardarlos en la base (19/08/2026). Hace falta porque multer corre
// ANTES del controller: para cuando se valida el body, las fotos y videos ya están en la
// cuenta de Cloudinary, y un 400 los dejaba ahí para siempre sin ninguna propiedad que
// los referencie —el mismo tipo de huérfanos que se limpió para los CV—.
// `f.filename` es el public_id que devuelve CloudinaryStorage, y el resource_type tiene
// que coincidir con el usado al subir (ver upload.middleware.js) o el destroy no
// encuentra el archivo. Los errores se ignoran a propósito: si la limpieza falla, la
// respuesta que le importa al admin sigue siendo el 400 de validación.
async function discardUploads(files) {
  if (!files?.length) return;
  await Promise.all(
    files.map((f) =>
      cloudinary.uploader
        .destroy(f.filename, {
          resource_type: f.mimetype?.startsWith('video/') ? 'video' : 'image',
        })
        .catch(() => {})
    )
  );
}

// Deriva el `public_id` de Cloudinary a partir de la URL guardada en PropertyImage.url
// (03/09/2026). Hace falta porque la tabla guarda solo la URL: cuando se subio el archivo
// teniamos `f.filename` (el public_id), pero eso no se persistio nunca. La URL tiene la
// forma:
//   https://res.cloudinary.com/<cloud>/<image|video>/upload/v<version>/<public_id>.<ext>
// asi que el public_id es todo lo que va despues de "/upload/", sin el segmento de
// version y sin la extension. Devuelve null si la URL no es de Cloudinary (por ejemplo
// las viejas /uploads/properties/... de cuando se guardaba en disco local), y en ese caso
// el borrado remoto se saltea sin romper nada.
function publicIdFromUrl(url) {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com')) return null;
  const afterUpload = url.split('/upload/')[1];
  if (!afterUpload) return null;
  // Se quita el prefijo de version (v1723456789/) si esta presente.
  const withoutVersion = afterUpload.replace(/^v\d+\//, '');
  // Se quita la extension del ultimo segmento (el public_id puede tener barras: incluye
  // la carpeta, ej "manhattan/properties/videos/abc123").
  const withoutExt = withoutVersion.replace(/\.[a-zA-Z0-9]+$/, '');
  return withoutExt || null;
}

// Borra de Cloudinary los archivos de una lista de filas de PropertyImage (03/09/2026).
// ANTES: al eliminar una foto o un video del panel solo se borraba la FILA de la base y
// el archivo quedaba en la cuenta de Cloudinary para siempre. Cada media borrada seguia
// consumiendo cuota del plan gratuito (25 GB), y cuando la cuota se agota Cloudinary
// empieza a rechazar TODAS las subidas nuevas — el mismo tipo de huerfano que ya se habia
// tapado para los CV y para las subidas descartadas por validacion (ver discardUploads).
// El resource_type tiene que coincidir con el usado al subir o el destroy no encuentra el
// archivo: se toma de la columna `type` y, si no esta, se deduce de la propia URL.
// Los errores se ignoran a proposito: si la limpieza remota falla, la fila ya se borro y
// lo que le importa al admin es que la operacion termine bien.
async function destroyMedia(images) {
  if (!images?.length) return;
  await Promise.all(
    images.map((img) => {
      const publicId = publicIdFromUrl(img.url);
      if (!publicId) return Promise.resolve();
      const isVideo = img.type === 'video' || img.url.includes('/video/upload/');
      return cloudinary.uploader
        .destroy(publicId, { resource_type: isVideo ? 'video' : 'image' })
        .catch(() => {});
    })
  );
}

// ¿La request viene del panel admin (token JWT válido)? Se usa para decidir si se
// pueden ver las propiedades PAUSADAS (published = false). No es un middleware
// porque estas rutas son públicas: acá el token es opcional, solo amplía lo que se
// devuelve. Sin token (o con uno inválido) la respuesta es la del visitante común.
function isAdminRequest(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return false;
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

// Normaliza el campo "llave" que llega del form. Devuelve null si el valor no sirve
// (el controller responde 400: es un campo obligatorio desde el 19/08/2026).
// `legacyHasKey` mantiene la compatibilidad con el booleano viejo por si alguna
// request todavía manda hasKey en vez de keyStatus.
function parseKeyStatus(raw, legacyHasKey) {
  if (raw === undefined || raw === '') {
    if (legacyHasKey === undefined) return null;
    return legacyHasKey === 'true' || legacyHasKey === true ? 'WITH' : 'WITHOUT';
  }
  return KEY_STATUS_VALUES.includes(raw) ? raw : null;
}

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
    const { operation, type, status, featured, search, includeUnpublished, page = 1, limit = 12 } = req.query;
    const where = {};
    // Pausadas (19/08/2026): por defecto NO se listan. Solo las incluye el panel admin,
    // que pide includeUnpublished=true Y manda un token válido. Se exigen las dos cosas:
    // el parámetro solo, sin token, no alcanza (si no, cualquiera vería las pausadas
    // agregándolo a la URL), y el token solo tampoco (así el admin, aunque esté logueado,
    // ve el sitio público igual que un visitante).
    if (!(includeUnpublished === 'true' && isAdminRequest(req))) where.published = true;
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
        // orderBy: { createdAt: 'desc' },
        // ↑ Comentado (03/09/2026): el orden era fijo —la mas nueva primero— y el admin
        //   no tenia forma de decidir que propiedad mostrar arriba. Ahora manda
        //   `displayOrder` (ver schema.prisma), que se define arrastrando las filas en el
        //   panel. `createdAt desc` se MANTIENE como segundo criterio: las propiedades
        //   que nunca se reordenaron empatan en displayOrder y entre ellas conservan
        //   exactamente el orden de antes, asi que el cambio no mueve nada por si solo.
        //   `id desc` cierra el desempate para que el orden sea estable entre paginas
        //   (sin un criterio unico, dos filas con la misma fecha podrian alternarse entre
        //   consultas y aparecer duplicadas o faltantes al paginar).
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
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
    // Pausada (19/08/2026): para el público no existe, ni siquiera entrando con el id
    // en la URL o con un link viejo guardado. Se responde el MISMO 404 que una
    // propiedad inexistente (no un 403) para no delatar que el id existe; el frontend
    // manda al visitante al catálogo. El panel admin (token válido) sí la ve, porque
    // necesita poder abrirla para editarla y volver a publicarla.
    if (!property.published && !isAdminRequest(req)) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }
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
    // Validación del id (11/08/2026): antes se pasaba Number(req.params.id) directo al
    // insert, así que una URL como /properties/abc/contact-click mandaba NaN a la base y
    // volvía como un 500. Ahora se descarta antes de tocar la BD.
    const propertyId = Number(req.params.id);
    if (!Number.isInteger(propertyId) || propertyId <= 0) {
      return res.status(400).json({ error: 'Id de propiedad inválido' });
    }
    await prisma.propertyEvent.create({ data: { propertyId, type: 'CONTACT_CLICK' } });
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
      bedrooms, bathrooms, area, garage, hasKey, keyStatus, address, city, neighborhood,
      lat, lng, featured, published, amenityIds, expenses, expensesCurrency,
    } = req.body;

    // "Llave" es obligatoria al crear (19/08/2026): hay que elegir explícitamente entre
    // con llave / sin llave / no mostrar, para que "no mostrar" sea una decisión y no
    // el resultado de olvidarse de tildar un check.
    const key = parseKeyStatus(keyStatus, hasKey);
    if (!key) {
      // Se descartan las fotos/videos que multer ya subió: no va a existir ninguna
      // propiedad que las referencie (ver discardUploads arriba).
      await discardUploads(req.files);
      return res.status(400).json({ error: 'Elegí una opción en "Llave"', message: 'Elegí una opción en "Llave"' });
    }

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
        keyStatus: key,
        // hasKey queda sincronizado con keyStatus (columna vieja, ver schema.prisma).
        hasKey: key === 'WITH',
        address, city,
        neighborhood: neighborhood || null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        featured: featured === 'true' || featured === true,
        // Al crear, una propiedad nace publicada salvo que el form mande published=false
        // (el selector "Pausada" del panel).
        published: published === undefined ? true : !(published === 'false' || published === false),
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
      bedrooms, bathrooms, area, garage, hasKey, keyStatus, address, city, neighborhood,
      lat, lng, featured, published, deleteImages, amenityIds, imageOrder,
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
    // Llave: si el form la manda (siempre lo hace), tiene que ser un valor válido.
    // hasKey se mantiene sincronizado con keyStatus (columna vieja, ver schema.prisma).
    if (keyStatus !== undefined || hasKey !== undefined) {
      const key = parseKeyStatus(keyStatus, hasKey);
      if (!key) {
        // Igual que en create: este 400 sale ANTES de tocar la base, así que los
        // archivos recién subidos no quedan referenciados por ninguna fila y hay que
        // borrarlos de Cloudinary. Es seguro hacerlo acá porque el createMany de la
        // media nueva ocurre más abajo, después de esta validación.
        await discardUploads(req.files);
        return res.status(400).json({ error: 'Elegí una opción en "Llave"', message: 'Elegí una opción en "Llave"' });
      }
      data.keyStatus = key;
      data.hasKey = key === 'WITH';
    }
    if (address !== undefined) data.address = address;
    if (city !== undefined) data.city = city;
    if (neighborhood !== undefined) data.neighborhood = neighborhood;
    if (lat !== undefined) data.lat = lat ? parseFloat(lat) : null;
    if (lng !== undefined) data.lng = lng ? parseFloat(lng) : null;
    if (featured !== undefined) data.featured = featured === 'true' || featured === true;
    // Pausar / republicar (19/08/2026): tanto desde el form de edición como desde el
    // botón rápido de la lista de propiedades del panel.
    if (published !== undefined) data.published = !(published === 'false' || published === false);

    // 1) Eliminar las marcadas para borrar.
    if (deleteImages) {
      const ids = JSON.parse(deleteImages);
      // await prisma.propertyImage.deleteMany({ where: { id: { in: ids } } });
      // ↑ Comentado (03/09/2026): borraba la fila y dejaba el archivo en Cloudinary para
      //   siempre (ver destroyMedia arriba). Ahora primero se leen las filas para saber
      //   que archivos hay que dar de baja, se borran de la base y recien despues se
      //   eliminan de Cloudinary. Ese orden importa: si el destroy remoto falla, la fila
      //   ya no esta y la propiedad queda consistente igual; al reves, un fallo de la
      //   base dejaria archivos borrados que la ficha todavia intenta mostrar.
      //   Se filtra por propertyId ademas de por id para que un `deleteImages` manipulado
      //   no pueda borrar media de OTRA propiedad.
      const toDelete = await prisma.propertyImage.findMany({
        where: { id: { in: ids }, propertyId: id },
      });
      await prisma.propertyImage.deleteMany({ where: { id: { in: toDelete.map((m) => m.id) } } });
      await destroyMedia(toDelete);
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

// Reordenar propiedades (03/09/2026). Recibe { ids: [...] } con los ids en el nuevo
// orden y guarda la posicion de cada una en `displayOrder` (indice del array).
// Solo admin (la ruta pasa por authMiddleware).
//
// Recibe la lista COMPLETA, no solo la fila movida: el panel manda todo el listado ya
// reordenado, asi es imposible que queden posiciones duplicadas o huecos.
//
// Va en una transaccion: si falla un update a la mitad, un orden parcialmente aplicado
// dejaria el listado mezclado sin que nadie se entere. O se aplica entero o nada.
exports.reorder = async (req, res) => {
  try {
    const raw = req.body?.ids;
    const ids = Array.isArray(raw) ? raw.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
    if (!ids.length) {
      return res.status(400).json({ error: 'Faltan ids', message: 'No se recibio ninguna propiedad para ordenar.' });
    }
    // Ids repetidos harian que una propiedad pise la posicion de otra.
    if (new Set(ids).size !== ids.length) {
      return res.status(400).json({ error: 'Ids repetidos', message: 'La lista de orden tiene propiedades repetidas.' });
    }
    // Se descartan los ids que no existen (por ejemplo, una propiedad borrada desde otra
    // pestaña mientras se arrastraba). Sin esto el update explota y se pierde todo el
    // reordenamiento por una sola fila fantasma.
    const existentes = await prisma.property.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const validos = new Set(existentes.map((p) => p.id));
    const finales = ids.filter((id) => validos.has(id));
    if (!finales.length) {
      return res.status(400).json({ error: 'Sin coincidencias', message: 'Ninguna de las propiedades enviadas existe.' });
    }

    await prisma.$transaction(
      finales.map((id, idx) =>
        prisma.property.update({ where: { id }, data: { displayOrder: idx } })
      )
    );

    res.json({ ok: true, ordenadas: finales.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al reordenar', message: 'No se pudo guardar el nuevo orden.' });
  }
};

exports.remove = async (req, res) => {
  try {
    // await prisma.property.delete({ where: { id: Number(req.params.id) } });
    // ↑ Comentado (03/09/2026): el `onDelete: Cascade` del schema borra las filas de
    //   PropertyImage junto con la propiedad, pero los archivos seguian en Cloudinary
    //   ocupando cuota sin que ninguna fila los referenciara — imposibles de rastrear
    //   despues. Ahora se leen las URLs ANTES del delete (despues ya no existen) y se
    //   limpian de Cloudinary una vez borrada la propiedad.
    const propertyId = Number(req.params.id);
    const media = await prisma.propertyImage.findMany({ where: { propertyId } });
    await prisma.property.delete({ where: { id: propertyId } });
    await destroyMedia(media);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar propiedad' });
  }
};

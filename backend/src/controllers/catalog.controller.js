const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// --- Catálogos gestionables: tipos de operación, tipos de propiedad y amenities ---
// Cada "kind" mapea a su modelo Prisma. Se exponen en /api/catalogs: GET público
// (lo usan el formulario de alta, los filtros y las páginas públicas) y CRUD admin.

const MODELS = {
  operations: () => prisma.operationType,
  propertyTypes: () => prisma.propertyTypeOption,
  amenities: () => prisma.amenity,
};

const slugify = (str) =>
  String(str || '')
    .trim()
    .toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // saca acentos
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || `ITEM_${Date.now()}`;

// GET /api/catalogs → { operations, propertyTypes, amenities } (público)
exports.getAll = async (req, res) => {
  try {
    const [operations, propertyTypes, amenities] = await Promise.all([
      prisma.operationType.findMany({ orderBy: { order: 'asc' } }),
      prisma.propertyTypeOption.findMany({ orderBy: { order: 'asc' } }),
      prisma.amenity.findMany({ orderBy: { order: 'asc' } }),
    ]);
    res.json({ operations, propertyTypes, amenities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los catálogos' });
  }
};

// POST /api/catalogs/:kind (admin) — crea un ítem
exports.create = async (req, res) => {
  const model = MODELS[req.params.kind];
  if (!model) return res.status(404).json({ error: 'Catálogo inexistente' });
  try {
    const { label, icon, order } = req.body;
    if (!label || !label.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
    // El value se autogenera desde el label si no se manda uno explícito.
    const value = (req.body.value && req.body.value.trim()) || slugify(label);
    const data = { value, label: label.trim(), order: order != null ? Number(order) : 0 };
    if (req.params.kind === 'amenities') data.icon = icon || '';
    const item = await model().create({ data });
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Ya existe un ítem con ese identificador' });
    console.error(err);
    res.status(500).json({ error: 'Error al crear el ítem' });
  }
};

// PUT /api/catalogs/:kind/:id (admin) — edita un ítem
exports.update = async (req, res) => {
  const model = MODELS[req.params.kind];
  if (!model) return res.status(404).json({ error: 'Catálogo inexistente' });
  try {
    const { label, icon, order, value } = req.body;
    const data = {};
    if (label !== undefined) data.label = label.trim();
    if (order !== undefined) data.order = Number(order);
    if (value !== undefined && value.trim()) data.value = value.trim();
    if (req.params.kind === 'amenities' && icon !== undefined) data.icon = icon;
    const item = await model().update({ where: { id: Number(req.params.id) }, data });
    res.json(item);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Ya existe un ítem con ese identificador' });
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el ítem' });
  }
};

// DELETE /api/catalogs/:kind/:id (admin) — elimina un ítem
exports.remove = async (req, res) => {
  const model = MODELS[req.params.kind];
  if (!model) return res.status(404).json({ error: 'Catálogo inexistente' });
  try {
    await model().delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el ítem' });
  }
};

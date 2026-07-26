const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// --- Contenido editable de las páginas del sitio (mini-CMS) ---
// El contenido se guarda como JSON por página. El frontend define el esquema de
// campos y los valores por defecto (frontend/src/config/siteContent.js); acá solo
// se persiste/lee el objeto tal cual, mergeado sobre lo que ya había.

// GET /api/content  → { home: {...}, footer: {...}, ... }  (público, para las páginas)
exports.getAll = async (req, res) => {
  try {
    const rows = await prisma.pageContent.findMany();
    const map = {};
    rows.forEach((r) => { map[r.page] = r.content; });
    res.json(map);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el contenido del sitio' });
  }
};

// GET /api/content/:page  → contenido de una sola página (público)
exports.getOne = async (req, res) => {
  try {
    const row = await prisma.pageContent.findUnique({ where: { page: req.params.page } });
    res.json(row?.content || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el contenido de la página' });
  }
};

// PUT /api/content/:page  → guarda el contenido de una página (admin)
// Se hace merge con lo existente para no perder campos que no vinieron en el body.
exports.update = async (req, res) => {
  try {
    const page = req.params.page;
    const incoming = req.body?.content ?? req.body ?? {};

    const existing = await prisma.pageContent.findUnique({ where: { page } });
    const merged = { ...(existing?.content || {}), ...incoming };

    const row = await prisma.pageContent.upsert({
      where: { page },
      update: { content: merged },
      create: { page, content: merged },
    });
    res.json(row.content);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar el contenido' });
  }
};

// POST /api/content/upload  → sube una imagen y devuelve su URL (admin)
// El editor la usa para las imágenes (hero, institucional, etc.): sube el archivo,
// recibe la URL y la incluye en el JSON de la página al guardar.
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });
    // res.status(201).json({ url: `/uploads/content/${req.file.filename}` });
    // ↑ Comentado: ya no se guarda localmente. Con CloudinaryStorage,
    //   `req.file.path` trae la URL completa de la imagen ya subida.
    res.status(201).json({ url: req.file.path });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al subir la imagen' });
  }
};

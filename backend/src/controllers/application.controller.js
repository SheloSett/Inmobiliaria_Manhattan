const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Controller de la página pública de postulaciones (10/08/2026). Cubre dos flujos
// independientes que comparten la misma página:
//   1. JobApplication  — postulación laboral con CV adjunto (bloque superior).
//   2. BranchInquiry   — "Abrí una sucursal con nosotros" (bloque inferior, sin archivo).
//
// Ambos se guardan en la BD para que queden en el panel admin, ADEMÁS de mandarse por
// WhatsApp desde el frontend. El envío por WhatsApp lo dispara el navegador del
// visitante (link wa.me), no el backend: acá solo se persiste y se devuelve el registro
// creado (con la URL del CV, que el frontend mete dentro del mensaje).

// Los campos de texto llegan por multipart (FormData) cuando hay archivo, así que
// siempre son strings. Se recortan y se validan los obligatorios.
const clean = (v) => (typeof v === 'string' ? v.trim() : '');

exports.createJobApplication = async (req, res) => {
  try {
    const name = clean(req.body.name);
    const email = clean(req.body.email);
    const phone = clean(req.body.phone);

    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Nombre, email y teléfono son obligatorios.' });
    }
    // El CV es obligatorio: sin archivo la postulación no tiene sentido. `req.file.path`
    // lo completa CloudinaryStorage con la URL pública del archivo ya subido.
    if (!req.file) {
      return res.status(400).json({ error: 'Adjuntá tu CV para completar la postulación.' });
    }

    const application = await prisma.jobApplication.create({
      data: {
        name,
        email,
        phone,
        city: clean(req.body.city),
        position: clean(req.body.position),
        message: clean(req.body.message),
        cvUrl: req.file.path,
        cvName: req.file.originalname || '',
      },
    });

    res.status(201).json(application);
  } catch {
    res.status(500).json({ error: 'Error al enviar la postulación' });
  }
};

exports.getJobApplications = async (req, res) => {
  try {
    const { read, page = 1, limit = 20 } = req.query;
    const where = {};
    if (read !== undefined) where.read = read === 'true';

    const [applications, total, unread] = await Promise.all([
      prisma.jobApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.jobApplication.count({ where }),
      // Total de no leídas sin filtrar: alimenta el contador del admin, que debe seguir
      // mostrando cuántas quedan aunque se esté viendo la solapa "Leídas".
      prisma.jobApplication.count({ where: { read: false } }),
    ]);

    res.json({ applications, total, unread });
  } catch {
    res.status(500).json({ error: 'Error al obtener las postulaciones' });
  }
};

exports.markJobApplicationRead = async (req, res) => {
  try {
    await prisma.jobApplication.update({
      where: { id: Number(req.params.id) },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al actualizar la postulación' });
  }
};

exports.createBranchInquiry = async (req, res) => {
  try {
    const name = clean(req.body.name);
    const email = clean(req.body.email);
    const phone = clean(req.body.phone);
    const city = clean(req.body.city);

    if (!name || !email || !phone || !city) {
      return res.status(400).json({ error: 'Nombre, email, teléfono y zona son obligatorios.' });
    }

    const inquiry = await prisma.branchInquiry.create({
      data: {
        name,
        email,
        phone,
        city,
        experience: clean(req.body.experience),
        message: clean(req.body.message),
      },
    });

    res.status(201).json(inquiry);
  } catch {
    res.status(500).json({ error: 'Error al enviar la solicitud' });
  }
};

exports.getBranchInquiries = async (req, res) => {
  try {
    const { read, page = 1, limit = 20 } = req.query;
    const where = {};
    if (read !== undefined) where.read = read === 'true';

    const [inquiries, total, unread] = await Promise.all([
      prisma.branchInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.branchInquiry.count({ where }),
      prisma.branchInquiry.count({ where: { read: false } }),
    ]);

    res.json({ inquiries, total, unread });
  } catch {
    res.status(500).json({ error: 'Error al obtener las solicitudes' });
  }
};

exports.markBranchInquiryRead = async (req, res) => {
  try {
    await prisma.branchInquiry.update({
      where: { id: Number(req.params.id) },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al actualizar la solicitud' });
  }
};

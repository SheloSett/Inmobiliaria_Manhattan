const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

exports.me = async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.admin.id },
      select: { id: true, email: true, name: true },
    });
    res.json(admin);
  } catch {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

// Actualiza el perfil del admin logueado (nombre y email). Agregado el 26/07/2026:
// antes la sección "Perfil de Cuenta" del panel no persistía nada (era solo maqueta).
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Nombre y email son obligatorios' });
    }
    // Evita chocar con el email de otro admin (email es unique en el modelo).
    const existing = await prisma.admin.findUnique({ where: { email } });
    if (existing && existing.id !== req.admin.id) {
      return res.status(409).json({ error: 'Ese email ya está en uso' });
    }
    const admin = await prisma.admin.update({
      where: { id: req.admin.id },
      data: { name, email },
      select: { id: true, email: true, name: true },
    });
    res.json(admin);
  } catch {
    res.status(500).json({ error: 'Error al actualizar el perfil' });
  }
};

// Cambia la contraseña del admin logueado, validando la contraseña actual.
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Completá la contraseña actual y la nueva' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }
    const admin = await prisma.admin.findUnique({ where: { id: req.admin.id } });
    const valid = await bcrypt.compare(currentPassword, admin.password);
    if (!valid) return res.status(401).json({ error: 'La contraseña actual es incorrecta' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.admin.update({ where: { id: req.admin.id }, data: { password: hashed } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
};

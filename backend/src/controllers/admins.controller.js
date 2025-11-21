const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET /api/admins
async function listAdmins(req, res) {
  const admins = await prisma.admin.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(admins);
}

// POST /api/admins
async function createAdmin(req, res) {
  const { name, email, password, isActive = true } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, password are required" });
  }

  const exists = await prisma.admin.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.create({
    data: { name, email, passwordHash, isActive },
    select: {
      id: true, name: true, email: true, isActive: true, createdAt: true
    },
  });

  res.json(admin);
}

// PUT /api/admins/:id
async function updateAdmin(req, res) {
  const id = Number(req.params.id);
  const { name, email, password, isActive } = req.body || {};

  const data = {
    name: name ?? undefined,
    email: email ?? undefined,
    isActive: typeof isActive === "boolean" ? isActive : undefined,
  };

  if (password) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  const admin = await prisma.admin.update({
    where: { id },
    data,
    select: {
      id: true, name: true, email: true, isActive: true, updatedAt: true
    },
  });

  res.json(admin);
}

module.exports = { listAdmins, createAdmin, updateAdmin };

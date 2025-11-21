const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function register(req, res) {
  const { name, email, password } = req.body;
  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already exists" });

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  const admin = await prisma.admin.create({
    data: { name, email, passwordHash }
  });

  res.json({ id: admin.id, name: admin.name, email: admin.email });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin || !admin.isActive) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() }
  });

  const token = jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  const secure = process.env.NODE_ENV === "production";
  res.cookie("pcfb_token", token, {
    httpOnly: true,
    sameSite: secure ? "strict" : "lax",
    secure,
    path: "/",
    maxAge: 7 * 24 * 3600 * 1000,
  });

  res.json({ id: admin.id, name: admin.name, email: admin.email });
}

function logout(req, res) {
  const secure = process.env.NODE_ENV === "production";
  res.clearCookie("pcfb_token", {
    httpOnly: true,
    secure,
    sameSite: secure ? "strict" : "lax",
    path: "/",
  });
  res.json({ ok: true });
}

async function me(req, res) {
  res.json({ admin: req.admin });
}

module.exports = { register, login, logout, me };

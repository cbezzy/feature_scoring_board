const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function slugify(input = "") {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || "module";
}

async function listModules(req, res) {
  const modules = await prisma.featureModule.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  res.json(modules);
}

async function createModule(req, res) {
  try {
    const { label, value, sortOrder } = req.body || {};
    if (!label || !label.trim()) {
      return res.status(400).json({ error: "Label is required" });
    }

    const count = await prisma.featureModule.count();

    const created = await prisma.featureModule.create({
      data: {
        label: label.trim(),
        value: (value && value.trim()) || slugify(label),
        sortOrder:
          typeof sortOrder === "number"
            ? sortOrder
            : count * 10, // keep some spacing for manual ordering
      },
    });

    res.json(created);
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ error: "Value must be unique" });
    }
    console.error("createModule error:", e);
    res.status(500).json({ error: "Failed to create module" });
  }
}

async function updateModule(req, res) {
  try {
    const id = Number(req.params.id);
    const { label, value, sortOrder, isActive } = req.body || {};

    const updated = await prisma.featureModule.update({
      where: { id },
      data: {
        label: label?.trim(),
        value: value?.trim(),
        sortOrder: typeof sortOrder === "number" ? sortOrder : undefined,
        isActive: typeof isActive === "boolean" ? isActive : undefined,
      },
    });

    res.json(updated);
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({ error: "Module not found" });
    }
    if (e.code === "P2002") {
      return res.status(409).json({ error: "Value must be unique" });
    }
    console.error("updateModule error:", e);
    res.status(500).json({ error: "Failed to update module" });
  }
}

async function deleteModule(req, res) {
  try {
    const id = Number(req.params.id);
    await prisma.featureModule.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({ error: "Module not found" });
    }
    console.error("deleteModule error:", e);
    res.status(500).json({ error: "Failed to delete module" });
  }
}

module.exports = {
  listModules,
  createModule,
  updateModule,
  deleteModule,
};


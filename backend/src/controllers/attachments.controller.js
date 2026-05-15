const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const {
  spacesConfigured,
  uploadObject,
  deleteObject,
  getSignedDownloadUrl,
} = require("../services/spaces");

const prisma = new PrismaClient();

function sanitizeFilename(name) {
  const base = String(name || "file").split(/[/\\]/).pop() || "file";
  return base.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 200);
}

async function uploadAttachment(req, res) {
  try {
    if (!spacesConfigured()) {
      return res
        .status(503)
        .json({ error: "File storage is not configured on the server" });
    }

    const featureId = Number(req.params.id);
    if (!Number.isInteger(featureId)) {
      return res.status(400).json({ error: "Invalid feature id" });
    }

    const feature = await prisma.featureRequest.findUnique({
      where: { id: featureId },
    });
    if (!feature) {
      return res.status(404).json({ error: "Feature not found" });
    }

    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({ error: "Missing file (use field name \"file\")" });
    }

    const adminId = req.admin?.id || null;
    const originalFilename = sanitizeFilename(file.originalname);
    const idPart = crypto.randomUUID();
    const objectKey = `pc-feature-board/features/${featureId}/${idPart}-${originalFilename}`;

    await uploadObject(file.buffer, {
      key: objectKey,
      contentType: file.mimetype || "application/octet-stream",
    });

    const row = await prisma.featureAttachment.create({
      data: {
        featureId,
        objectKey,
        originalFilename,
        mimeType: file.mimetype || null,
        sizeBytes: file.size,
        uploadedByAdminId: adminId,
      },
    });

    const downloadUrl = await getSignedDownloadUrl(row.objectKey);
    const { objectKey: _omit, ...rest } = row;
    res.json({ ...rest, downloadUrl });
  } catch (e) {
    console.error("uploadAttachment error:", e);
    res.status(500).json({ error: "Failed to upload attachment" });
  }
}

async function deleteAttachment(req, res) {
  try {
    const featureId = Number(req.params.id);
    const attachmentId = Number(req.params.attachmentId);
    if (!Number.isInteger(featureId) || !Number.isInteger(attachmentId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const att = await prisma.featureAttachment.findFirst({
      where: { id: attachmentId, featureId },
    });
    if (!att) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    await prisma.featureAttachment.delete({ where: { id: attachmentId } });

    if (spacesConfigured()) {
      try {
        await deleteObject(att.objectKey);
      } catch (e) {
        console.error("deleteObject (Spaces) failed:", e.message || e);
      }
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("deleteAttachment error:", e);
    res.status(500).json({ error: "Failed to delete attachment" });
  }
}

module.exports = { uploadAttachment, deleteAttachment };

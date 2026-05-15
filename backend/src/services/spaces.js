const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

function spacesConfigured() {
  return Boolean(
    process.env.DO_SPACES_ENDPOINT &&
      process.env.DO_SPACES_REGION &&
      process.env.DO_SPACES_BUCKET &&
      process.env.DO_SPACES_KEY &&
      process.env.DO_SPACES_SECRET
  );
}

function getS3Client() {
  return new S3Client({
    region: process.env.DO_SPACES_REGION,
    endpoint: process.env.DO_SPACES_ENDPOINT,
    credentials: {
      accessKeyId: process.env.DO_SPACES_KEY,
      secretAccessKey: process.env.DO_SPACES_SECRET,
    },
    forcePathStyle: false,
  });
}

/**
 * @param {Buffer} body
 * @param {{ key: string, contentType?: string }} opts
 */
async function uploadObject(body, opts) {
  if (!spacesConfigured()) {
    throw new Error("DigitalOcean Spaces is not configured (DO_SPACES_* env)");
  }
  const client = getS3Client();
  const bucket = process.env.DO_SPACES_BUCKET;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: opts.key,
      Body: body,
      ContentType: opts.contentType || "application/octet-stream",
    })
  );
}

async function deleteObject(key) {
  if (!spacesConfigured()) return;
  const client = getS3Client();
  const bucket = process.env.DO_SPACES_BUCKET;
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

/** @param {string} key @param {number} [expiresInSeconds=3600] */
async function getSignedDownloadUrl(key, expiresInSeconds = 3600) {
  if (!spacesConfigured()) {
    throw new Error("DigitalOcean Spaces is not configured (DO_SPACES_* env)");
  }
  const client = getS3Client();
  const bucket = process.env.DO_SPACES_BUCKET;
  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(client, cmd, { expiresIn: expiresInSeconds });
}

module.exports = {
  spacesConfigured,
  uploadObject,
  deleteObject,
  getSignedDownloadUrl,
};

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

function objectKey(value, bucket, region) {
  if (!value) return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const hosts = [`${bucket}.s3.amazonaws.com`, `${bucket}.s3.${region}.amazonaws.com`, `${bucket}.s3-${region}.amazonaws.com`];
  if (!hosts.includes(url.hostname)) return null;
  return decodeURIComponent(url.pathname.slice(1));
}
const clients = new Map();
const signedUrls = new Map();

async function signImage(value, options = {}) {
  if (!value) return value;
  const bucket = options.bucket || process.env.S3_BUCKET;
  const region = options.region || process.env.AWS_REGION;
  if (!bucket || !region) throw new Error('S3_BUCKET and AWS_REGION must be configured.');
  const key = objectKey(value, bucket, region);
  if (key === null) return value; // Preserve external posters and existing local image paths.
  if (options.client) return getSignedUrl(options.client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });
  const cacheKey = JSON.stringify([bucket, region, key]);
  const cached = signedUrls.get(cacheKey);
  if (cached && cached.until > Date.now()) return cached.url;
  let client = clients.get(region);
  if (!client) { client = new S3Client({ region }); clients.set(region, client); }
  const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });
  if (signedUrls.size >= 2000) signedUrls.delete(signedUrls.keys().next().value);
  signedUrls.set(cacheKey, { url, until: Date.now() + 5 * 60 * 1000 });
  return url;
}
module.exports = { objectKey, signImage };

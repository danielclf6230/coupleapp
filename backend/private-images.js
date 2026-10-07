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
async function signImage(value, options = {}) {
  if (!value) return value;
  const bucket = options.bucket || process.env.S3_BUCKET;
  const region = options.region || process.env.AWS_REGION;
  if (!bucket || !region) throw new Error('S3_BUCKET and AWS_REGION must be configured.');
  const key = objectKey(value, bucket, region);
  if (key === null) return value; // Preserve external posters and existing local image paths.
  const client = options.client || new S3Client({ region });
  try { return await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 }); }
  finally { if (!options.client) client.destroy(); }
}
module.exports = { objectKey, signImage };

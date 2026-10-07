const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const { S3Client, CopyObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { objectKey } = require('./private-images');

async function main() {
  const args = process.argv.slice(2);
  const envIndex = args.indexOf('--env');
  const envPath = envIndex >= 0 ? args[envIndex + 1] : path.join(__dirname, '.env');
  if (!envPath || !fs.existsSync(envPath)) throw new Error('Configure backend/.env, or provide --env <path>.');
  const env = { ...dotenv.parse(fs.readFileSync(envPath)), ...process.env };
  const bucket = 'couple-app-bucket-new-2026';
  const region = env.AWS_REGION || 'us-east-2';
  const apply = args.includes('--apply');
  if (env.S3_BUCKET && env.S3_BUCKET !== bucket) throw new Error('S3_BUCKET must be the coupleapp bucket.');
  const db = await mysql.createConnection({ host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER, password: env.DB_PASS, database: 'coupledb' });
  const client = new S3Client({ region, ...(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY ? { credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY } } : {}) });
  let migrated = 0;
  try {
    const [rows] = await db.query('SELECT a.id, a.a_img, a.album_id, t.name FROM albums a JOIN album_types t ON t.id = a.album_id ORDER BY a.id');
    const plans = [];
    for (const row of rows) {
      const key = objectKey(row.a_img, bucket, region);
      if (!key || !/^album_\d+\//.test(key)) continue;
      const folder = row.name.normalize('NFC').trim().replace(/[\\/\u0000-\u001f\u007f]/g, '-');
      if (!folder || folder === '.' || folder === '..') throw new Error(`Invalid album name for album ${row.album_id}.`);
      const nextKey = folder + '/' + key.slice(key.indexOf('/') + 1);
      plans.push({ ...row, key, nextKey });
    }
    const destinations = new Set();
    for (const plan of plans) {
      if (destinations.has(plan.nextKey)) throw new Error('Duplicate destination key; resolve before migration.');
      destinations.add(plan.nextKey);
    }
    console.log(`${apply ? 'Applying' : 'Previewing'} ${plans.length} photo migrations.`);
    const groups = new Map();
    for (const p of plans) groups.set(`${p.key.split('/')[0]} -> ${p.nextKey.split('/')[0]}`, (groups.get(`${p.key.split('/')[0]} -> ${p.nextKey.split('/')[0]}`) || 0) + 1);
    for (const [name, count] of groups) console.log(`${name}: ${count} photos`);
    if (!apply) { console.log('No changes made. Add --apply to copy photos and update database URLs. Originals are retained.'); return; }
    // Verify credentials and bucket access before changing anything.
    await client.config.credentials();
    for (const p of plans) {
      const original = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: p.key }));
      let existing;
      try { existing = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: p.nextKey })); }
      catch (error) { if (error.$metadata?.httpStatusCode !== 404) throw error; }
      if (existing && (existing.Metadata?.['album-migration-source'] !== encodeURIComponent(p.key) || existing.ContentLength !== original.ContentLength)) {
        throw new Error(`Destination already exists for photo ${p.id}; refusing to overwrite.`);
      }
      if (!existing) await client.send(new CopyObjectCommand({
        Bucket: bucket, Key: p.nextKey,
        CopySource: bucket + '/' + p.key.split('/').map(encodeURIComponent).join('/'),
        CopySourceIfMatch: original.ETag,
        MetadataDirective: 'REPLACE', ContentType: original.ContentType,
        Metadata: { ...original.Metadata, 'album-migration-source': encodeURIComponent(p.key) },
      }));
      const copy = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: p.nextKey }));
      if (copy.ContentLength !== original.ContentLength || copy.Metadata?.['album-migration-source'] !== encodeURIComponent(p.key)) throw new Error(`Copy verification failed for photo ${p.id}.`);
      const url = `https://${bucket}.s3.amazonaws.com/${p.nextKey.split('/').map(encodeURIComponent).join('/')}`;
      const [result] = await db.execute('UPDATE albums SET a_img = ? WHERE id = ? AND a_img = ?', [url, p.id, p.a_img]);
      if (result.affectedRows !== 1) throw new Error(`Photo ${p.id} changed during migration; original retained.`);
      migrated++;
    }
    console.log(`Updated ${migrated} photos. Original S3 objects retained for recovery; no objects deleted.`);
  } finally { client.destroy(); await db.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

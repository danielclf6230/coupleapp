const test = require('node:test');
const assert = require('node:assert/strict');
const { S3Client } = require('@aws-sdk/client-s3');
const { objectKey, signImage } = require('./private-images');
const { requireAuth } = require('./auth');
const jwt = require('jsonwebtoken');
test('recognizes existing S3 URLs without signing other buckets', () => {
  assert.equal(objectKey('https://couple-app-bucket-new-2026.s3.amazonaws.com/album_2/my%20photo.jpg', 'couple-app-bucket-new-2026', 'us-east-2'), 'album_2/my photo.jpg');
  assert.equal(objectKey('https://other-bucket.s3.amazonaws.com/photo.jpg', 'couple-app-bucket-new-2026', 'us-east-2'), null);
});
test('returns signed read URLs and preserves external and empty images', async () => {
  const client = new S3Client({ region: 'us-east-2', credentials: { accessKeyId: 'TESTKEY', secretAccessKey: 'offline-test-secret' } });
  const opts = { client, bucket: 'couple-app-bucket-new-2026', region: 'us-east-2' };
  try {
    const url = new URL(await signImage('https://couple-app-bucket-new-2026.s3.amazonaws.com/avatars/1.jpg', opts));
    assert.equal(url.pathname, '/avatars/1.jpg');
    assert.equal(url.searchParams.get('X-Amz-Expires'), '3600');
    assert.ok(url.searchParams.get('X-Amz-Signature'));
    assert.equal(await signImage('https://example.com/poster.jpg', opts), 'https://example.com/poster.jpg');
    assert.equal(await signImage(null, opts), null);
  } finally { client.destroy(); }
});
test('requires a valid token and an existing user', async () => {
  const original = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'offline-test-secret-at-least-32-characters';
  try {
    const check = async (authorization, rows = [{ id: 1 }]) => {
      let status, passed = false;
      const res = { status(s) { status = s; return this; }, json() {} };
      await requireAuth({ query: async () => [rows] })({ headers: { authorization } }, res, error => { if (error) throw error; passed = true; });
      return { status, passed };
    };
    assert.equal((await check('')).status, 401);
    assert.equal((await check('Bearer invalid')).status, 401);
    const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    assert.equal((await check(`Bearer ${token}`)).passed, true);
    assert.equal((await check(`Bearer ${token}`, [])).status, 401);
    const expired = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: -1 });
    assert.equal((await check(`Bearer ${expired}`)).status, 401);
  } finally { if (original === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = original; }
});

test('image routes reject anonymous access and return signed images after login', async () => {
  const express = require('express');
  const previous = Object.fromEntries(['AWS_REGION', 'S3_BUCKET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'JWT_SECRET'].map(key => [key, process.env[key]]));
  Object.assign(process.env, { AWS_REGION: 'us-east-2', S3_BUCKET: 'couple-app-bucket-new-2026', AWS_ACCESS_KEY_ID: 'TESTKEY', AWS_SECRET_ACCESS_KEY: 'offline-secret', JWT_SECRET: 'offline-test-secret-at-least-32-characters' });
  const original = 'https://couple-app-bucket-new-2026.s3.amazonaws.com/album_2/photo.jpg';
  const dbPath = require.resolve('./config/db');
  const cachedDb = require.cache[dbPath];
  const db = { query: async sql => {
    if (sql.includes("INSERT INTO albums")) return [{ insertId: 99 }];
    if (sql.includes("SELECT name FROM album_types")) return [[{ name: "July 2025 #1" }]];
    if (sql === 'SELECT id FROM users WHERE id = ?') return [[{ id: 1 }]];
    if (sql.includes('FROM albums')) return [[{ id: 2, a_img: original }]];
    if (sql.includes('FROM movies')) return [[{ id: 3, m_img: original }]];
    return [[{ avatarUrl: original }]];
  }};
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: db };
  const app = express();
  app.use(requireAuth(db));
  app.use('/api/album', require('./routes/albumRoutes'));
  app.use('/api/movies', require('./routes/moviesRoutes'));
  app.use('/api/users', require('./routes/userRoutes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    for (const [path, field] of [['/api/album', 'a_img'], ['/api/movies', 'm_img'], ['/api/users/1', 'avatarUrl']]) {
      assert.equal((await fetch(base + path)).status, 401);
      const response = await fetch(base + path, { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(response.status, 200);
      const data = await response.json();
      const image = (Array.isArray(data) ? data[0] : data)[field];
      assert.ok(new URL(image).searchParams.get('X-Amz-Signature'));
    }
    const originalSend = S3Client.prototype.send;
    let uploadedKey;
    S3Client.prototype.send = async function(command) { uploadedKey = command.input.Key; return {}; };
    try {
      const body = new FormData();
      body.append('album_id', '2');
      body.append('image', new Blob(['test image'], { type: 'image/jpeg' }), 'photo.jpg');
      const response = await fetch(base + '/api/album/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
      assert.equal(response.status, 200);
      assert.ok(uploadedKey.startsWith('July 2025 #1/'));
      assert.ok(response.headers.get("server-timing").includes("s3;dur="));
      const result = await response.json();
      assert.equal(result.photo.id, 99);
      assert.equal(result.photo.album_name, "July 2025 #1");
      assert.equal(result.photo.a_img, result.url);
      assert.equal(decodeURIComponent(new URL(result.url).pathname).slice(1), uploadedKey);
      assert.ok(new URL(result.url).searchParams.get('X-Amz-Signature'));
    } finally { S3Client.prototype.send = originalSend; }
    assert.equal(original.includes('?'), false);
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (cachedDb) require.cache[dbPath] = cachedDb; else delete require.cache[dbPath];
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

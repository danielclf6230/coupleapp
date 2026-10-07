const express = require("express");
const router = express.Router();
const { signImage } = require("../private-images");
const multer = require("multer");
const { randomUUID } = require("node:crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const db = require("../config/db");

// 🔧 Multer memory storage for S3
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🔧 AWS S3 setup
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const bucketName = process.env.S3_BUCKET;

/* ------------------------------------------------------------------
   🆕  Create new album (album_types table)
-------------------------------------------------------------------*/
router.post("/create", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Album name is required" });

  try {
    const [exists] = await db.query(
      "SELECT id FROM album_types WHERE name = ?",
      [name]
    );
    if (exists.length > 0) {
      return res.status(400).json({ message: "Album already exists." });
    }

    await db.query(
      "INSERT INTO album_types (name, created_at) VALUES (?, CURDATE())",
      [name]
    );
    res.status(201).json({ message: "Album created successfully" });
  } catch (err) {
    console.error("Album create error:", err);
    res
      .status(500)
      .json({ message: "Failed to create album", error: err.message });
  }
});

/* ------------------------------------------------------------------
   🧾  Get all album types (for dropdown)
-------------------------------------------------------------------*/
router.get("/types", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, created_at FROM album_types ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("Fetch album types error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch album types", error: err.message });
  }
});

/* ------------------------------------------------------------------
   📤  Upload photo to S3
-------------------------------------------------------------------*/
router.post("/upload", upload.single("image"), async (req, res) => {
  const { album_id, date } = req.body;
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  if (!album_id) return res.status(400).json({ message: "Missing album_id" });

  try {
    const started = performance.now();
    const albumId = Number(album_id);
    if (!Number.isSafeInteger(albumId) || albumId < 1) {
      return res.status(400).json({ message: "Invalid album_id" });
    }
    const [albumTypes] = await db.query("SELECT name FROM album_types WHERE id = ?", [albumId]);
    if (!albumTypes.length) return res.status(404).json({ message: "Album not found" });
    const folder = albumTypes[0].name.normalize("NFC").trim()
      .replace(/[\\/\u0000-\u001f\u007f]/g, "-");
    if (!folder || folder === "." || folder === "..") {
      return res.status(400).json({ message: "Please give the album a valid name before uploading." });
    }
    const file = req.file;
    const filename = file.originalname.replace(/[\\/\u0000-\u001f\u007f]/g, "-");
    const fileKey = `${folder}/${randomUUID()}_${filename}`;

    const s3Started = performance.now();
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    const s3Duration = performance.now() - s3Started;
    const dbStarted = performance.now();
    const encodedKey = fileKey.split("/").map(encodeURIComponent).join("/");
    const fileUrl = `https://${bucketName}.s3.amazonaws.com/${encodedKey}`;
    const [inserted] = await db.query(
      "INSERT INTO albums (a_img, a_date, album_id) VALUES (?, ?, ?)",
      [fileUrl, date || new Date(), album_id]
    );

    const dbDuration = performance.now() - dbStarted;
    const signedUrl = await signImage(fileUrl);
    res.set('Server-Timing', `s3;dur=${s3Duration.toFixed(1)}, db;dur=${dbDuration.toFixed(1)}, total;dur=${(performance.now() - started).toFixed(1)}`);
    res.json({ message: "Upload successful", url: signedUrl, photo: {
      id: inserted.insertId, a_img: signedUrl, a_date: date || new Date().toISOString().slice(0, 10),
      album_id: albumId, album_name: albumTypes[0].name,
    } });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

/* ------------------------------------------------------------------
   📸  Get all photos
-------------------------------------------------------------------*/
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.id, a.a_img, a.a_date, a.album_id, t.name AS album_name
      FROM albums a
      LEFT JOIN album_types t ON a.album_id = t.id
      ORDER BY a.a_date DESC
    `);
    res.json(await Promise.all(rows.map(async row => ({ ...row, a_img: await signImage(row.a_img) }))));
  } catch (err) {
    console.error("Fetch photos error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch photos", error: err.message });
  }
});

/* ------------------------------------------------------------------
   ❌  Delete photo
-------------------------------------------------------------------*/
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM albums WHERE id = ?", [req.params.id]);
    res.json({ message: "Photo deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res
      .status(500)
      .json({ message: "Failed to delete photo", error: err.message });
  }
});

module.exports = router;

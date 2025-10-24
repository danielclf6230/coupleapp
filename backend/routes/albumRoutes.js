const express = require("express");
const router = express.Router();
const multer = require("multer");
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
    const file = req.file;
    const fileKey = `album_${album_id}/${Date.now()}_${file.originalname}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    const fileUrl = `https://${bucketName}.s3.amazonaws.com/${fileKey}`;
    await db.query(
      "INSERT INTO albums (a_img, a_date, album_id) VALUES (?, ?, ?)",
      [fileUrl, date || new Date(), album_id]
    );

    res.json({ message: "Upload successful", url: fileUrl });
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
    res.json(rows);
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

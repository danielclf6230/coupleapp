const express = require("express");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const db = require("../config/db");
const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.S3_BUCKET;

router.post("/upload", upload.single("poster"), async (req, res) => {
  try {
    let { id, m_name, m_watched_date, m_status } = req.body;
    m_watched_date =
      !m_watched_date ||
      m_watched_date === "undefined" ||
      m_watched_date === "null"
        ? null
        : m_watched_date;
    let fileUrl = null;

    if (req.file) {
      const fileKey = `movie-poster/${Date.now()}_${req.file.originalname}`;
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      });
      await s3.send(command);
      fileUrl = `https://${bucketName}.s3.amazonaws.com/${fileKey}`;
    }

    if (id) {
      const updateFields = ["m_name = ?", "m_watched_date = ?", "m_status = ?"];
      const params = [m_name, m_watched_date, m_status];

      if (fileUrl) {
        updateFields.push("m_img = ?");
        params.push(fileUrl);
      }

      updateFields.push("m_update_date = NOW()");
      params.push(id);

      await db.query(
        `UPDATE movies SET ${updateFields.join(", ")} WHERE id = ?`,
        params
      );
    } else {
      await db.query(
        `INSERT INTO movies (m_name, m_img, m_watched_date, m_status, m_update_date)
         VALUES (?, ?, ?, ?, NOW())`,
        [m_name, fileUrl, m_watched_date, m_status]
      );
    }

    res.json({ message: "Success" });
  } catch (err) {
    console.error("Movie upload error:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let sql = "SELECT * FROM movies";
    const params = [];

    if (search) {
      sql += " WHERE m_name LIKE ?";
      params.push(`%${search}%`);
    }

    sql +=
      " ORDER BY CASE m_status WHEN 2 THEN 1 WHEN 0 THEN 2 WHEN 1 THEN 3 END, m_watched_date DESC";

    const [results] = await db.query(sql, params);
    res.json(results);
  } catch (err) {
    console.error("Fetch movies error:", err);
    res.status(500).json({ message: "Fetch failed", error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM movies WHERE id = ?", [id]);
    res.json({ message: "Movie deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
});

module.exports = router;

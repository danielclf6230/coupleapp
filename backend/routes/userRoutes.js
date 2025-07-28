const express = require("express");
const router = express.Router();
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const db = require("../config/db");

// S3 setup
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

// 🔹 Get user by ID
router.get("/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const [rows] = await db.query("SELECT avatarUrl FROM users WHERE id = ?", [
      userId,
    ]);
    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("Fetch user error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// 🔹 Upload avatar
router.post("/upload-avatar", upload.single("image"), async (req, res) => {
  const userId = req.body.userId;

  if (!req.file || !userId) {
    return res.status(400).json({ message: "Missing image or userId" });
  }

  const fileKey = `avatars/${userId}.jpg`;

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    await s3.send(command);
    const fileUrl = `https://${bucketName}.s3.amazonaws.com/${fileKey}`;

    await db.query("UPDATE users SET avatarUrl = ? WHERE id = ?", [
      fileUrl,
      userId,
    ]);

    res.status(200).json({ message: "Avatar uploaded", url: fileUrl });
  } catch (error) {
    console.error("Upload avatar error:", error);
    res.status(500).json({
      message: "Avatar upload failed",
      error: error.message,
    });
  }
});

module.exports = router;

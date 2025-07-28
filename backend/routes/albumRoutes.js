const express = require("express");
const router = express.Router();
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const db = require("../config/db");

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

if (!bucketName) {
  console.error("S3_BUCKET is not defined in environment variables.");
  return res
    .status(500)
    .json({ message: "Server config error: S3_BUCKET missing." });
}

// Upload Endpoint
router.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const file = req.file;
    const typeFolder = req.body.type || "uncategorized";
    const fileKey = `${typeFolder}/${Date.now()}_${file.originalname}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    console.log("Uploading file:", file.originalname);
    console.log("Bucket name:", bucketName);

    await s3.send(command);

    const fileUrl = `https://${bucketName}.s3.amazonaws.com/${fileKey}`;
    await db.query(
      "INSERT INTO albums (a_img, a_type, a_date) VALUES (?, ?, ?)",
      [fileUrl, req.body.type, req.body.date]
    );

    res.status(200).json({ message: "Upload successful", url: fileUrl });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
});

// Get all images
router.get("/", async (req, res) => {
  try {
    const [results] = await db.query(
      "SELECT * FROM albums ORDER BY a_date DESC"
    );
    res.json(results);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ message: "Fetch failed", error: err });
  }
});

router.delete("/:id", async (req, res) => {
  const photoId = req.params.id;
  try {
    await db.query("DELETE FROM albums WHERE id = ?", [photoId]);
    res.status(200).json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;

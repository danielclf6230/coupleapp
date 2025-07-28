const express = require("express");
const db = require("../config/db");
const router = express.Router();

router.post("/upload", async (req, res) => {
  try {
    const { id, n_title, n_content } = req.body;

    if (id) {
      await db.query(
        `UPDATE notes SET n_title = ?, n_content = ?, n_update_date = NOW() WHERE id = ?`,
        [n_title, n_content, id]
      );
    } else {
      await db.query(
        `INSERT INTO notes (n_title, n_content, n_update_date) VALUES (?, ?, NOW())`,
        [n_title, n_content]
      );
    }

    res.json({ message: "Success" });
  } catch (err) {
    console.error("Note upload error:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let sql = "SELECT * FROM notes";
    const params = [];

    if (search) {
      sql += " WHERE n_title LIKE ?";
      params.push(`%${search}%`);
    }

    sql += " ORDER BY n_update_date DESC";

    const [results] = await db.query(sql, params);
    res.json(results);
  } catch (err) {
    console.error("Fetch notes error:", err);
    res.status(500).json({ message: "Fetch failed", error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM notes WHERE id = ?", [id]);
    res.json({ message: "Note deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("../config/db"); // adjust path to your db config

// GET all countdowns
router.get("/", async (req, res) => {
  try {
    const [countdowns] = await db.query(
      "SELECT * FROM coupledb.countdowns ORDER BY cd_target_date ASC"
    );
    res.json(countdowns);
  } catch (err) {
    console.error("Error fetching countdowns:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/upload", async (req, res) => {
  const { id, cd_title, cd_emoji, cd_target_date } = req.body;

  if (!cd_title || !cd_target_date) {
    return res
      .status(400)
      .json({ error: "Title and Target Date are required." });
  }

  try {
    if (id) {
      console.log("🛠 Updating:", { id, cd_title, cd_emoji, cd_target_date });
      await db.query(
        "UPDATE coupledb.countdowns SET cd_title=?, cd_emoji=?, cd_target_date=? WHERE id=?",
        [cd_title, cd_emoji, cd_target_date, id]
      );
    } else {
      console.log("➕ Inserting:", { cd_title, cd_emoji, cd_target_date });
      await db.query(
        "INSERT INTO coupledb.countdowns (cd_title, cd_emoji, cd_target_date) VALUES (?, ?, ?)",
        [cd_title, cd_emoji, cd_target_date]
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("🔥 Error saving countdown:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// DELETE a countdown
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM coupledb.countdowns WHERE id=?", [
      req.params.id,
    ]);
    res.sendStatus(200);
  } catch (err) {
    console.error("Error deleting countdown:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

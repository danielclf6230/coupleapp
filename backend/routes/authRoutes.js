const express = require("express");
const router = express.Router();
const { signImage } = require("../private-images");
const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

router.post("/login", async (req, res) => {
  console.log("🔐 Login endpoint hit");
  const { name, password } = req.body;
  console.log(`➡️ Trying login for: ${name}`);

  try {
    // ✅ Check DB connection (already verified)
    await db.query("SELECT 1");

    // ✅ Query user using promise syntax
    const [results] = await db.query("SELECT * FROM users WHERE name = ?", [
      name,
    ]);
    console.log("🐬 DB query executed");

    if (results.length === 0) {
      console.log("❌ No user found");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = results[0];
    console.log("🔍 User found:", user.name);

    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log("🔐 Password match:", passwordMatch);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      id: user.id,
      name: user.name,
      avatarUrl: await signImage(user.avatarUrl || null),
      bannerUrl: await signImage(user.bannerUrl || null),
      token,
    });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

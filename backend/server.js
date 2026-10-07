require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const { requireAuth } = require("./auth");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const albumRoutes = require("./routes/albumRoutes");
const moviesRoutes = require("./routes/moviesRoutes");
const countDownRoutes = require("./routes/countDownRoutes");
const noteRoutes = require("./routes/noteRoutes");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "https://danielandkristen.vercel.app"],
    credentials: true,
  })
);

app.use(express.json());
app.use("/uploads", express.static("uploads"));

// ✅ Health check route
app.get("/", (req, res) => res.send("✅ API is running"));

// ✅ Route handlers
app.use("/api/auth", authRoutes);
app.use("/api", requireAuth(db));
app.use("/api", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
app.use("/api/users", userRoutes);
app.use("/api/album", albumRoutes);
app.use("/api/movies", moviesRoutes);
app.use("/api/countdowns", countDownRoutes);
app.use("/api/notes", noteRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

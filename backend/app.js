// app.js

const express   = require("express");
const mongoose  = require("mongoose");
const cors      = require("cors");
const dotenv    = require("dotenv");

// Load env vars
dotenv.config();

// Route handlers
const authRoutes    = require("./routes/auth");
const deviceRoutes  = require("./routes/devices");
const sessionRoutes = require("./routes/sessions");

// MQTT Subscriber (if you still need it)
const startMqttSubscriber = require("./mqttSubscriber");

const app = express();

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const client_URLs = process.env.CLIENT_URL;

// CORS: allow your frontend origins
app.use(cors({
  origin: (origin, callback) => {
    if (origin && client_URLs==origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Serve static assets (e.g. your SVG/clipart for SessionStart page):
app.use(express.static("public"));

// ─── DATABASE ────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err.message));

// ─── ROUTES ────────────────────────────────────────────────────────────────────
// Authentication
app.use("/api/auth", authRoutes);

// Devices (location, charger type, rate)
app.use("/api/devices", deviceRoutes);

// Sessions (start, stop, by-transaction, by-sessionId, etc.)
app.use("/api/sessions", sessionRoutes);

// Legacy GET endpoint (optional; can remove if you use `/api/sessions/by-transaction`)
app.get("/api/getDevice", async (req, res) => {
  try {
    const { transactionId } = req.query;
    if (!transactionId) {
      return res.status(400).json({ error: "Transaction ID is required" });
    }
    const session = await require("./models/session").findOne({ transactionId });
    if (!session) {
      return res.status(404).json({ error: "Transaction ID not found" });
    }
    res.json(session);
  } catch (err) {
    console.error("Error fetching session:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start your MQTT subscriber after HTTP is running
startMqttSubscriber();

// ─── START SERVER ──────────────────────────────────────────────────────────────
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const deviceRoutes = require("./routes/devices");
const sessionRoutes = require("./routes/sessions");
const Device = require("./models/device");
const Session = require("./models/session");  
require("dotenv").config();
dotenv.config();
const app = express();
const CLIENT_URL = [
  "http://localhost:3000",
  "https://ornate-profiterole-873549.netlify.app", // your frontend live URL
];


app.use(express.json()); // Ensure this is present!
app.use(express.urlencoded({ extended: true })); 
app.use(
  cors({
    origin: CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ MongoDB Connection (Using Environment Variables)
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((error) => console.error("❌ MongoDB Connection Error:", error));

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/auth", require("./routes/auth"));

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || CLIENT_URL.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);





// ✅ Get session details
app.get("/api/getDevice", async (req, res) => {
  try {
    const { transactionId } = req.query;
    if (!transactionId) return res.status(400).json({ error: "Transaction ID is required" });

    const session = await Session.findOne({ transactionId });
    if (!session) return res.status(404).json({ error: "Transaction ID not found" });

    res.status(200).json(session);
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});




// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
// exports.api = functions.https.onRequest(app);
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


app.use(express.json()); // Ensure this is present!
app.use(express.urlencoded({ extended: true })); 
app.use(
  cors({
    origin: process.env.CLIENT_URL || "https://ornate-profiterole-873549.netlify.app",
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

// ✅ Get all devices
app.get("/api/devices", async (req, res) => {
  try {
    const devices = await Device.find({}, { lat: 1, lng: 1, device_id: 1, location: 1, status: 1, charger_type: 1 });
    res.json(devices);
  } catch (err) {
    console.error("Error fetching devices:", err);
    res.status(500).json({ message: "Error fetching devices" });
  }
});

// ✅ Get a specific device by device_id
app.get("/api/devices/:device_id", async (req, res) => {
  try {
    const device = await Device.findOne({ device_id: req.params.device_id });
    if (!device) return res.status(404).json({ error: "Device not found" });
    res.json(device);
  } catch (error) {
    console.error("Error fetching device details:", error);
    res.status(500).json({ error: "Failed to fetch device details" });
  }
});

// ✅ Start a session
app.post("/api/sessions/start", async (req, res) => {
  try {
    console.log("🔹 Full Request Body Received:", req.body); // LOG FULL REQUEST BODY

    const { sessionId, deviceId, transactionId, startTime, startDate, amountPaid, energySelected } = req.body;

  
 // 🚨 Debug individual fields
 console.log("🔹 Extracted values:");
 console.log("  - sessionId:", sessionId);
 console.log("  - deviceId:", deviceId);
 console.log("  - transactionId:", transactionId);
 console.log("  - startTime:", startTime);
 console.log("  - startDate:", startDate);
 console.log("  - amountPaid:", amountPaid);
 console.log("  - energySelected:", energySelected);


    if (!sessionId || !deviceId || !transactionId || !startTime || !startDate || amountPaid === undefined || energySelected === undefined) {
      console.error("❌ Missing required fields!", { sessionId, deviceId, transactionId, startTime, startDate, amountPaid, energySelected });
      return res.status(400).json({ error: "Transaction ID and Device ID are required" });
    }
    
    if (!startDate) {
      throw new Error("startDate is missing from request body");
    }
    console.log("✅ Extracted session data:", { sessionId, startTime, startDate });

    const existingSession = await Session.findOne({ transactionId });
    if (existingSession) {
      return res.status(400).json({ error: "Session already exists with this transaction ID" });
    }

    const newSession = new Session({
      transactionId,
      deviceId,
      sessionId: `session-${transactionId}`,
      startTime, // ✅ Use standardized UTC format
      startDate, // ✅ Extract only the date
      amountPaid,     // ✅ Ensure amountPaid is saved
     energySelected, // ✅ Ensure energySelected is saved
    });

    await newSession.save();
    return res.status(201).json({ message: "Session started", sessionId });
  } catch (error) {
    console.error("Error starting session:", error.message);
    return res.status(400).json({ error: error.message });
  }
});

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

// ✅ Update energy consumed and amount used
app.post("/api/sessions/update", async (req, res) => {
  try {
    const { sessionId, energyConsumed, amountUsed } = req.body;

    if (!sessionId) return res.status(400).json({ error: "Session ID is required" });

    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: "Session not found" });

    session.energyConsumed = energyConsumed;
    session.amountUsed = amountUsed;
    await session.save();

    res.status(200).json({ message: "Session data updated successfully" });
  } catch (error) {
    console.error("Error updating session data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Stop session and save end time & trigger (auto/manual)
app.post("/api/sessions/stop", async (req, res) => {
  try {
    const { sessionId, endTime, endTrigger } = req.body;

    if (!sessionId || !endTime || !endTrigger) {
      return res.status(400).json({ error: "Session ID, end time, and trigger type are required" });
    }

    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: "Session not found" });

    session.endTime = new Date(endTime).toISOString(); // ✅ Standardize time format
    session.endTrigger = endTrigger;
    await session.save();

    res.status(200).json({ message: "Session ended successfully" });
  } catch (error) {
    console.error("Error stopping session:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ✅ Check if an active session exists for a user/device
app.get("/api/sessions/active", async (req, res) => {
  try {
    const { userId, deviceId } = req.query;

    if (!userId || !deviceId) {
      return res.status(400).json({ error: "User ID and Device ID are required" });
    }

    // 🔍 Find an active session (No endTime means session is still active)
    const activeSession = await Session.findOne({ userId, deviceId, endTime: null });

    if (!activeSession) {
      return res.status(404).json({ message: "No active session found" });
    }

    res.status(200).json(activeSession);
  } catch (error) {
    console.error("Error checking active session:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
// exports.api = functions.https.onRequest(app);
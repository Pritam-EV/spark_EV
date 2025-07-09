const express = require("express");
const Session = require("../models/session"); // Import Mongoose schema
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware"); // Authentication Middleware
const mongoose = require("mongoose");
const Device = require("../models/device"); // ⬅️ Add this at the top if not already
const { endSession } = require("../controllers/sessionControllers");

// ✅ Fetch session by Transaction ID (renamed to avoid route collision)
router.get("/by-transaction/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;
    const session = await Session.findOne({ transactionId });

    if (!session) {
      return res.status(404).json({ error: "Transaction ID not found." });
    }

    res.json(session);
  } catch (err) {
    console.error("Error fetching session:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ✅ GET active session for deviceId
router.get("/active", async (req, res) => {
  const { deviceId } = req.query;
  if (!deviceId) {
    return res.status(400).json({ message: "Missing deviceId parameter" });
  }
  try {
    const activeSession = await Session.findOne({
      deviceId,
      status: "active",
    });
    if (activeSession) {
      res.json(activeSession);
    } else {
      res.status(404).json({ message: "No active session found" });
    }
  } catch (error) {
    console.error("Error fetching active session:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// ✅ Start Session (Triggered after payment success)
router.post("/start", authMiddleware, async (req, res) => {
  const {
    sessionId,
    deviceId,
    transactionId,
    startTime,
    startDate,
    amountPaid,
    energySelected,
  } = req.body;

  const userId = req.user ? req.user.userId : null;
  console.log("🔹 Received session start request:", req.body);
  console.log("🔹 Checking transactionId in DB:", transactionId);
  console.log("🔹 Extracted User ID:", userId);

  try {
    if (
      !sessionId ||
      !deviceId ||
      !transactionId ||
      !startTime ||
      !userId ||
      !amountPaid ||
      !energySelected
    ) {
      console.error("❌ Missing required fields:", {
        sessionId,
        deviceId,
        transactionId,
        startTime,
        startDate,
        userId,
        amountPaid,
        energySelected,
      });
      return res.status(400).json({ error: "Missing required fields." });
    }

    const parsedStartTime = new Date(startTime);
    if (isNaN(parsedStartTime.getTime())) {
      console.error("❌ Invalid startTime format:", startTime);
      return res.status(400).json({ error: "Invalid startTime format. Expected ISO format." });
    }

    // ✅ Convert to IST (GMT+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istStartTime = new Date(parsedStartTime.getTime() + istOffset);

    // Ensure the transaction ID is unique
    const existingSession = await Session.findOne({ transactionId });
    console.log("🔹 Existing session found:", existingSession);
    if (existingSession) {
      console.error("❌ Transaction ID already exists:", transactionId);
      return res.status(400).json({ error: "Transaction ID already exists." });
    }



// ✅ Check if device is already occupied
const device = await Device.findOne({ device_id: deviceId });

if (!device) {
  return res.status(404).json({ error: "Device not found" });
}

if (device.status === "occupied") {
  return res.status(400).json({ error: "Device is currently in use" });
}

    // Create the new session
    const newSession = await Session.create({
      sessionId,
      deviceId,
      transactionId,
      startTime: istStartTime,
      startDate,
      status: "active",
      userId,
      amountPaid,
      energySelected,
    });


// 🔹 Update device status to 'occupied' and link current session
await Device.findOneAndUpdate(
  { device_id: deviceId },
  {
    $set: {
      status: "Occupied",
      current_session_id: newSession._id,
    },
  }
);


    console.log("✅ Session created successfully:", newSession);
    res.status(200).json({
      message: "Session started successfully.",
      sessionId: newSession.sessionId || newSession._id,
    });
  } catch (err) {
    console.error("Error starting session:", err.message);
    res.status(500).json({ error: "Failed to start session." });
  }
});

// ✅ End Session
router.post("/stop", authMiddleware, async (req, res) => {
  try {
    const { sessionId, endTime, endTrigger } = req.body;
    console.log("🔹 Received stop session request:", req.body);

    if (!sessionId || !endTime) {
      return res.status(400).json({ error: "Missing sessionId or endTime" });
    }

    const session = await Session.findOneAndUpdate(
      { sessionId },
      { $set: { status: "completed", endTime, endTrigger } },
      { new: true }
    );

if (session && session.deviceId) {
  // 🔹 Set device status to 'available' and clear session
  await Device.findOneAndUpdate(
    { device_id: session.deviceId },
    {
      $set: {
        status: "Available",
        current_session_id: null,
      },
    }
  );
}


    if (!session) {
      console.error("❌ Session not found:", sessionId);
      return res.status(404).json({ error: "Session not found" });
    }

    console.log("✅ Session updated successfully:", session);
    res.json({ message: "Session ended successfully", session });
  } catch (error) {
    console.error("❌ Error stopping session:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Handle Payment Success Webhook or Callback
router.post("/payment-success", async (req, res) => {
  const {
    transactionId,
    deviceId,
    sessionId,
    startTime,
    amountPaid,
    energySelected,
  } = req.body;

  try {
    if (!transactionId || !deviceId || !sessionId || !startTime) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const existingSession = await Session.findOne({ transactionId });
    if (existingSession) {
      return res
        .status(200)
        .json({ message: "Session already exists", session: existingSession });
    }

    await Session.create({
      sessionId,
      deviceId,
      transactionId,
      startTime,
      status: "active",
      amountPaid,
      energySelected,
    });

    res
      .status(200)
      .json({ message: "Session created successfully after payment." });
  } catch (err) {
    console.error("Error handling payment success:", err.message);
    res.status(500).json({ error: "Failed to process payment success." });
  }
});

// ✅ Update session data every 5 seconds
router.post("/update", async (req, res) => {
  const { sessionId, energyConsumed, amountUsed } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required" });
  }

  try {
    const updatedSession = await Session.findOneAndUpdate(
      { sessionId },
      { $set: { energyConsumed, amountUsed } },
      { new: true }
    );

    if (!updatedSession) {
      return res.status(404).json({ error: "Session not found" });
    }

    res
      .status(200)
      .json({ message: "Session updated successfully", updatedSession });
  } catch (error) {
    console.error("Error updating session:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Fetch session by Session ID (renamed to avoid route collision)
router.get("/user-sessions", authMiddleware, async (req, res) => {
  try {
    const userIdString = req.user.userId;
    console.log("UserID string from token:", userIdString);

    if (!mongoose.Types.ObjectId.isValid(userIdString)) {
      return res.status(400).json({ message: "Invalid userId in token." });
    }

    const userId = new mongoose.Types.ObjectId(userIdString); // MUST use 'new'

    const sessions = await Session.find({ userId }).sort({ startTime: -1 });
    console.log(`Sessions found: ${sessions.length}`);

    const activeSessions = sessions.filter(s => !s.endTime);
    const pastSessions = sessions.filter(s => s.endTime);

    res.json({ activeSessions, pastSessions });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/end", endSession);
module.exports = router;
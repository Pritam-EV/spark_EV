const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const mongoose = require("mongoose");
const sessionController = require('../controllers/sessionController');


const {
  startSession,
  endSession,
  getSessionByTransactionId,
  getSessionById,
  getLiveDeviceSensorData,
  getActiveSession,
} = require("../controllers/sessionController");

const Session = require("../models/session");
const Device = require("../models/device");

// 1. Fetch session by transaction ID (for SessionStart page)
router.get(
  "/by-transaction/:transactionId",
  authMiddleware,
  getSessionByTransactionId
);

// 8. User’s sessions list
router.get("/user-sessions", authMiddleware, async (req, res) => {
  try {
    const userIdString = req.user.userId;
    if (!mongoose.Types.ObjectId.isValid(userIdString)) {
      return res.status(400).json({ message: "Invalid userId in token." });
    }
    const userId = new mongoose.Types.ObjectId(userIdString);
    const sessions = await Session.find({ userId }).sort({ startTime: -1 });
    const activeSessions = sessions.filter(s => !s.endTime);
    const pastSessions = sessions.filter(s => s.endTime);
    res.json({ activeSessions, pastSessions });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 2. Fetch session by session ID (for LiveSession page)
router.get(
  "/:sessionId",
  authMiddleware,
  getSessionById
);

// 3. Active session lookup (unchanged)
// Add this route for getting the active session of the authenticated user
router.get('/active', authMiddleware, getActiveSession);
module.exports = router;

// 4. Start session (Triggered after payment success)
router.post("/start", authMiddleware, startSession);

// 5. Stop session
router.post("/stop", authMiddleware, endSession);

// 6. Payment success webhook
router.post("/payment-success", async (req, res) => {
  const { transactionId, deviceId, sessionId, startTime, amountPaid, energySelected } = req.body;
  const userId = req.user.userId;                // ← capture userId
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
    const newSession = await Session.create({
      sessionId,
      deviceId,
      transactionId,
      startTime,
      status: "active",
      amountPaid,
      energySelected,
      userId,      
    });
    res.status(200).json({ message: "Session created successfully after payment.", session: newSession });
  } catch (err) {
    console.error("Error handling payment success:", err);
    res.status(500).json({ error: "Failed to process payment success." });
  }
});

// 7. Update session data every 5 seconds
router.post("/update", async (req, res) => {
  const { sessionId, energyConsumed, amountUsed } = req.body;
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });
  const session = await Session.findOne({ sessionId });
  if (!session) return res.status(404).json({ error: "Session not found" });
  session.energyConsumed = energyConsumed;
  session.amountUsed = amountUsed;
  await session.save();
  res.json({ message: "Updated" });
});



// 9. Optional: fetch live sensor data for a device
router.get(
  "/device/:deviceId/sensor",
  authMiddleware,
  getLiveDeviceSensorData
);

module.exports = router;

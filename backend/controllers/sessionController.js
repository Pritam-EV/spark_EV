const Session = require("../models/session");  // ✅ Import Session model
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// ✅ Create session from ESP32 device (or frontend after Razorpay)
const startSession = async (req, res) => {
  try {
    console.log("🔹 Full `req.body` received in backend:", req.body);

    const {
      sessionId,
      deviceId,
      transactionId,
      startTime,
      startDate,
      energySelected,
      amountPaid,
      userId, // optional
    } = req.body;

    // ✅ Validate required fields
    if (!sessionId || !deviceId || !transactionId || !startTime || !startDate  || energySelected === undefined || amountPaid === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ Avoid duplicate transactions
    const existingSession = await Session.findOne({ transactionId });
    if (existingSession) {
      return res.status(409).json({ message: "Session already exists for this transaction" });
    }

    const newSession = new Session({
      sessionId,
      deviceId,
      transactionId,
      startTime: new Date(startTime),
      startDate,
      energySelected,
      amountPaid,
      userId: userId || null, // Optional (null if not passed)
    });

    await newSession.save();

    console.log("✅ New session created:", newSession.sessionId);
    res.status(201).json({ message: "Session started successfully", sessionId: newSession.sessionId });
  } catch (error) {
    console.error("❌ Error starting session:", error.message);
    res.status(500).json({ message: "Failed to start session" });
  }
};



module.exports = { startSession };

// POST /api/sessions/end
const endSession = async (req, res) => {
  try {
    const {
      sessionId,
      endTime,
      currentEnergy,
      deltaEnergy,
      amountUsed,
      endTrigger,
      deviceId,
    } = req.body;

    if (!sessionId || !endTime || !currentEnergy || !deltaEnergy || !amountUsed || !endTrigger) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Find session by sessionId
    const session = await Session.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Update the session with final values
    session.energyConsumed = deltaEnergy;
    session.amountUsed = amountUsed;
    session.endTime = new Date(endTime);
    session.status = "completed";
    session.endTrigger = endTrigger;

    await session.save();

    res.status(200).json({ message: "Session ended and updated successfully", session });
  } catch (err) {
    console.error("❌ Error ending session:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  endSession,
};

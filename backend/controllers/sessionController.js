const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
require("dotenv").config(); // Load environment variables

// ✅ Use environment variable for JWT secret
const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const token = jwt.sign(
    { id: user._id },  // ✅ Make sure `_id` is included
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

// ✅ Google Auth Client
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const startSession = async (req, res) => {
    try {
        console.log("🔹 Full `req.body` received in backend:", req.body);  // ✅ Log the full request body
      const { sessionId, deviceId, transactionId, startTime, startDate, amountPaid, energySelected } = req.body;
      console.log("🔹 Extracted values -> amountPaid:", amountPaid, "energySelected:", energySelected);
      // ✅ Ensure all required fields exist
     if (!sessionId || !deviceId || !transactionId || !startTime || !startDate || amountPaid === undefined || energySelected === undefined) {
       return res.status(400).json({ message: "Missing required fields" });
     }
  
      console.log("🔹 Received request data:", req.body);
  
      // ✅ Ensure amountPaid and energySelected are correctly extracted
     console.log("🔹 Extracted values -> amountPaid:", amountPaid, "energySelected:", energySelected);
  
      const existingSession = await Session.findOne({ transactionId });
  
      if (existingSession) {
        return res.status(400).json({ message: "Session already exists for this transaction" });
      }
  
      const newSession = new Session({
        sessionId,
        deviceId,
        transactionId,
        startTime,
        startDate,
       amountPaid, // ✅ Make sure it's saved in MongoDB
       energySelected, // ✅ Save selected energy
      });
  
      await newSession.save();
  
      res.status(201).json({ message: "Session started successfully.", sessionId });
    } catch (error) {
      console.error("❌ Error starting session:", error.message);
      res.status(500).json({ message: "Failed to start session" });
    }
  };
  
  module.exports = { startSession};
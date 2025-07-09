const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  deviceId: { type: String, required: true },
  transactionId: { type: String, required: true, unique: true },
  startTime: { type: Date, required: true },
  startDate: { type: String, required: true },
  startEnergy: { type: Number, required: true },  // New
  endEnergy: { type: Number, default: null },     // New
  energySelected: { type: Number, required: true },
  energyConsumed: { type: Number, default: 0 },
  amountPaid: { type: Number, required: true },
  amountUsed: { type: Number, default: 0 },
  ratePerKwh: { type: Number, default: 19 }, // Useful for backend calc
  status: { type: String, enum: ["active", "completed"], default: "active" },
  endTrigger: { type: String, default: null },
  endTime: { type: Date, default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false }
});

module.exports = mongoose.model("Session", sessionSchema);

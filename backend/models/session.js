// models/session.js
const mongoose = require("mongoose");

const telemetrySchema = new mongoose.Schema({
  timestamp: { type: Date,   required: true },
  power_W:   { type: Number, required: true },
  voltage:   { type: Number, required: false },
  current:   { type: Number, required: false },
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  sessionId:      { type: String,  required: true, unique: true },
  deviceId:       { type: String,  required: true },
  transactionId:  { type: String,  required: true, unique: true },
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  startTime:      { type: Date,    required: true },
  startDate:      { type: String,  required: true },
  startEnergy:    { type: Number,  default: null },     // kWh at start
  energySelected: { type: Number,  required: true },    // target kWh
  energyConsumed: { type: Number,  default: 0 },        // current kWh
  amountPaid:     { type: Number,  required: true },    // ₹ prepaid
  amountUsed:     { type: Number,  default: 0 },        // ₹ used so far
  ratePerKwh:     { type: Number,  default: 20 },       // ₹/kWh
  status:         { type: String,  enum: ["active","completed","faulty"], default: "active" },
  endTrigger:     { type: String,  default: null },
  endTime:        { type: Date,    default: null },
  telemetry:      { type: [telemetrySchema], default: [] }, // live data points
}, {
  timestamps: true
});

const Session = mongoose.model("Session", sessionSchema);
module.exports = Session;

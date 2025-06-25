const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    deviceId: { type: String, required: true },
    transactionId: { type: String, required: true, unique: true },
    startTime: { type: Date, required: true },
    startDate: { type: String, required: true },
    amountPaid: { type: Number, required: true }, // ✅ Added
    energySelected: { type: Number, required: true }, // ✅ Added
    energyConsumed: { type: Number, default: 0 },
    amountUsed: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "completed"], default: "active" },
    endTrigger: { type: String, default: null },
    endTime: { type: Date, default: null }, // ✅ Make it optional
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

module.exports = mongoose.model("Session", sessionSchema);
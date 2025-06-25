const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    vehicleType: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    googleId: { type: String, default: null }, // For Google Sign-in users
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;

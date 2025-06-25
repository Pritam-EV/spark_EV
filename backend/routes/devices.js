const express = require('express');
const router = express.Router();
const Device = require('../models/device'); // Adjust path as needed

router.get('/', async (req, res) => {
  try {
    const devices = await Device.find({}, 'device_id location status charger_type lat lng'); // Only fetch required fields
    res.status(200).json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ message: 'Error fetching devices', error });
  }
});

// Check if a device exists
router.get("/check-device/:device_id", async (req, res) => {
  try {
    const { device_id } = req.params; // Get device ID from URL

    if (!device_id) { // Fix: Use device_id instead of deviceId
      return res.status(400).json({ error: "Device ID is required" });
    }

    // Check if device exists in MongoDB
    const device = await Device.findOne({ device_id });

    if (device) {
      return res.json({ exists: true, device });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    console.error("Error checking device:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Get device status by ID
router.get("/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findOne({ device_id: deviceId });
    if (!device) return res.status(404).json({ error: "Device not found" });
    res.json(device);
  } catch (error) {
    console.error("Error fetching device:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});




module.exports = router;

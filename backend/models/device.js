const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  device_id: { type: String, required: true },
  location: { type: String, required: true }, // Optional (e.g., City, Street Name)
  lat: { type: Number, required: true }, // Latitude of device
  lng: { type: Number, required: true }, // Longitude of device
  status: { type: String, required: true },
  charger_type: { type: String, required: true },
  current_session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
    rate: { type: Number, required: true, default: 20 }, // Default ₹20/kWh
});

const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);
module.exports = Device;

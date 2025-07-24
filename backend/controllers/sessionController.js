const Session = require("../models/session");
const Device = require("../models/device");

// GET /api/sessions/active
const getActiveSession = async (req, res) => {
  try {
    const userId = req.user.userId;  // or however your auth middleware attaches the user
    console.log(`Fetching active session for user ${userId}`);
    // Find one active session for this user
    const session = await Session.findOne({ userId, status: 'active' }).lean();
    if (!session) {
      console.warn('No active session found');
      return res.status(404).json({ error: 'No active session' });
    }
    // Optionally find the latest telemetry entry for voltage/current
    let latestVoltage = 0, latestCurrent = 0;
    if (session.telemetry && session.telemetry.length > 0) {
      const lastEntry = session.telemetry[session.telemetry.length - 1];
      latestVoltage = lastEntry.voltage || 0;
      latestCurrent = lastEntry.current || 0;
    }
    // Prepare response data (include only needed fields)
    const responseData = {
      sessionId: session.sessionId,
      transactionId: session.transactionId,
      energySelected: session.energySelected,
      amountPaid: session.amountPaid,
      energyConsumed: session.energyConsumed,
      startDate: session.startDate,
      startTime: session.startTime,
      voltage: latestVoltage,
      current: latestCurrent
    };
    console.log('Active session data:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Error in getActiveSession:', error);
    res.status(500).json({ error: 'Server error fetching active session' });
  }
};

/**
 * @desc   Start a new charging session
 * @route  POST /api/sessions/start
 * @access Private
 */
const startSession = async (req, res) => {
  try {
    const {
      sessionId,
      deviceId,
      transactionId,
      startTime,
      startDate,
      energySelected,
      amountPaid,
      startEnergy
    } = req.body;

    const userId = req.user ? req.user.userId : null;

    // Validate required fields
    if (!sessionId || !deviceId || !transactionId || !startTime || !startDate || energySelected === undefined || amountPaid === undefined) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // Check duplicate transaction
    if (await Session.findOne({ transactionId })) {
      return res.status(409).json({ error: "Transaction already exists." });
    }

    // Check device availability
    const device = await Device.findOne({ device_id: deviceId });
    if (!device) return res.status(404).json({ error: "Device not found." });
    if (device.status === "Occupied") {
      return res.status(409).json({ error: "Device is currently occupied." });
    }

    // Create session
    const newSession = new Session({
      sessionId,
      deviceId,
      transactionId,
      userId,
      startTime: new Date(startTime),
      startDate,
      energySelected,
      amountPaid,
      startEnergy: startEnergy || null,
      status: "active",
    });
    await newSession.save();

    // Update device status
    device.status = "Occupied";
    device.current_session_id = newSession._id;
    await device.save();

    res.status(201).json({ message: "Session started successfully.", session: newSession });
  } catch (err) {
    console.error("Error starting session:", err);
    res.status(500).json({ error: "Failed to start session." });
  }
};

/**
 * @desc   End an active charging session
 * @route  POST /api/sessions/stop
 * @access Private
 */
const endSession = async (req, res) => {
  console.log("Stop request received:", req.body);

  try {
    const { sessionId, endTime, endTrigger, currentEnergy, deltaEnergy, amountUsed, deviceId } = req.body;

    if (!sessionId || !endTime || !endTrigger) {
      console.warn("Missing fields in stop request:", req.body);
      return res.status(400).json({ error: "Missing required fields." });
    }

    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: "Session not found." });

    // Update session
    session.endTime = new Date(endTime);
    session.endTrigger = endTrigger;
    if (deltaEnergy !== undefined) session.energyConsumed = deltaEnergy;
    if (amountUsed !== undefined) session.amountUsed = amountUsed;
    session.status = "completed";
    session.endEnergy = currentEnergy || session.startEnergy + session.energyConsumed;
    await session.save();

    // Free up device
    const device = await Device.findOne({ device_id: deviceId || session.deviceId });
    if (device) {
      device.status = "Available";
      device.current_session_id = null;
      await device.save();
    }

    res.status(200).json({ message: "Session ended successfully.", session });
  } catch (err) {
    console.error("Error ending session:", err);
    res.status(500).json({ error: "Failed to end session." });
  }
};

/**
 * @desc   Get session by transaction ID
 * @route  GET /api/sessions/by-transaction/:transactionId
 * @access Private
 */
const getSessionByTransactionId = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const session = await Session.findOne({ transactionId });
    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }
    res.status(200).json(session);
  } catch (err) {
    console.error("Error fetching session by transactionId:", err);
    res.status(500).json({ error: "Server error." });
  }
};

/**
 * @desc   Get session by session ID
 * @route  GET /api/sessions/:sessionId
 * @access Private
 */
const getSessionById = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }
    res.status(200).json(session);
  } catch (err) {
    console.error("Error fetching session by ID:", err);
    res.status(500).json({ error: "Server error." });
  }
};

/**
 * @desc   Get live sensor data for a device
 * @route  GET /api/sessions/device/:deviceId/sensor
 * @access Private
 */
const getLiveDeviceSensorData = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findOne({ device_id: deviceId });
    if (!device) {
      return res.status(404).json({ error: "Device not found." });
    }
    res.status(200).json({
      voltage: device.voltage || 0,
      current: device.current || 0,
      energy: device.energy || 0,
      status: device.status
    });
  } catch (err) {
    console.error("Error fetching live sensor data:", err);
    res.status(500).json({ error: "Server error." });
  }
};

const SessionController = {
  startSession,
  endSession, // Only export this, not stopSession
  getSessionByTransactionId,
  getSessionById,
  getLiveDeviceSensorData,
  getActiveSession,
};
module.exports = SessionController;

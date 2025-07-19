// mqttSubscriber.js
const mqtt     = require('mqtt');
const mongoose = require('mongoose');
const Session  = require('./models/session');
const Device   = require('./models/device');

const MQTT_URL      = 'wss://223f72957a1c4fa48a3ae815c57aab34.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_OPTIONS = {
  username:        process.env.MQTT_USER,
  password:        process.env.MQTT_PASS,
  protocol:        'wss',
  rejectUnauthorized: false,
  reconnectPeriod: 2000,
};

function startMqttSubscriber() {
  const client = mqtt.connect(MQTT_URL, MQTT_OPTIONS);

  client.on('connect', () => {
    console.log('Backend connected to MQTT');
    client.subscribe([
      'device/+/sessionCommand',
      'device/+/session/live',
      'device/+/session/end',
      'device/+/status',
      'device/+/session/info',
    ], { qos: 1 }, err => {
      if (err) console.error('❌ MQTT subscribe failed:', err);
    });
  });

  client.on('message', async (topic, buf) => {
    const payload = buf.toString();
    if (!payload) {
      console.warn(`⚠️ Empty payload on ${topic}`);
      return;
    }

    let msg;
    try {
      msg = JSON.parse(payload);
    } catch (e) {
      console.error(`❌ Invalid JSON on ${topic}:`, payload);
      return;
    }

    if (typeof msg !== 'object' || msg === null) {
      console.error(`❌ Non-object payload on ${topic}:`, msg);
      return;
    }

    const parts   = topic.split('/');
    const deviceId = parts[1];
    const section  = parts[2];  // "session" or "status"
    const action   = parts[3];  // e.g. "info", "live", "end"

    try {
      // ─── SESSION INFO ─────────────────────────────────────────────────────
      if (section === 'session' && action === 'info') {
        const {
          sessionId,
          transactionId,
          startTime,
          energy_kWh,
          amountPaid,
          userId,
        } = msg;

        if (!sessionId || !transactionId || !startTime) {
          console.error(`❌ Missing fields in session/info on ${topic}:`, msg);
          return;
        }

        // Prepare upsert object
        const upd = {
          sessionId,
          deviceId,
          transactionId,
          startTime: new Date(startTime),
          startDate: startTime.split('T')[0],
          energySelected: energy_kWh,
          amountPaid,
          status: 'active',
        };

        if (userId) {
          // convert string to ObjectId if valid
          try {
            upd.userId = mongoose.Types.ObjectId(userId);
          } catch {}
        }

        const sessionDoc = await Session.findOneAndUpdate(
          { sessionId },
          { $setOnInsert: upd },
          { upsert: true, new: true }
        );

        await Device.findOneAndUpdate(
          { device_id: deviceId },
          { status: 'Occupied', current_session_id: sessionDoc._id }
        );
      }

      // ─── LIVE TELEMETRY ───────────────────────────────────────────────────
      else if (section === 'session' && action === 'live') {
        if (!msg.sessionId || msg.energy_kWh == null) {
          console.error(`❌ Missing fields in session/live on ${topic}:`, msg);
          return;
        }
        await Session.updateOne(
          { sessionId: msg.sessionId },
          { energyConsumed: msg.energy_kWh }
        );
      }

      // ─── SESSION END ─────────────────────────────────────────────────────
      else if (section === 'session' && action === 'end') {
        const { sessionId, endTime, energy_kWh, endTrigger } = msg;
        if (!sessionId) {
          console.error(`❌ Missing sessionId in session/end on ${topic}:`, msg);
          return;
        }

        const sess = await Session.findOneAndUpdate(
          { sessionId },
          {
            endTime:        new Date(endTime || msg.timestamp),
            energyConsumed: energy_kWh,
            status:         'completed',
            endTrigger:     endTrigger || 'auto',
          },
          { new: true }
        );
        if (!sess) {
          console.error(`❌ No session found to end for ${sessionId}`);
          return;
        }

        await Device.findOneAndUpdate(
          { device_id: sess.deviceId },
          { status: 'Available', current_session_id: null }
        );
      }

      // ─── DEVICE STATUS ───────────────────────────────────────────────────
      else if (section === 'status') {
        if (msg.status == null) {
          console.error(`❌ Missing status in status topic on ${topic}:`, msg);
          return;
        }
        await Device.updateOne(
          { device_id: deviceId },
          { status: msg.status }
        );
      }

      else {
        // ignore other topics (like sessionCommand)
      }

      console.log(`✅ Processed ${topic}`);
    } catch (err) {
      console.error(`❌ Error handling ${topic}:`, err);
    }
  });

  client.on('error', err => console.error('❌ MQTT client error:', err));
}

module.exports = startMqttSubscriber;

// mqttSubscriber.js
const mqtt = require('mqtt');
const Session = require('./models/session');
const Device  = require('./models/device');

const MQTT_URL      = 'wss://223f72957a1c4fa48a3ae815c57aab34.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_OPTIONS = {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
  protocol: 'wss',
  rejectUnauthorized: false,
  reconnectPeriod: 2000,
};

function startMqttSubscriber() {
  const client = mqtt.connect(MQTT_URL, MQTT_OPTIONS);

  client.on('connect', () => {
    console.log('🔌 MQTT Subscriber connected');
    // subscribe to all device topics
    client.subscribe([
      'device/+/sessionCommand',
      'device/+/session/live',
      'device/+/session/end',
      'device/+/status',
      'device/+/session/info',
    ], { qos: 1 }, (err) => {
      if (err) console.error('❌ MQTT subscribe failed:', err);
    });
  });

  client.on("message", async (topic, buf) => {
    let msg;
    try {
      msg = JSON.parse(buf.toString());
    } catch (e) {
      return console.error("❌ Invalid JSON on", topic);
    }

    const parts = topic.split("/");
    const deviceId = parts[1];
    const section  = parts[2];      // "session" or "status"
    const action   = parts[3];      // e.g. "info", "live", "end" (or undefined for status)

    try {
      if (section === "session" && action === "info") {
        // Create or upsert the Session document, including userId
        const upd = {
          sessionId:      msg.sessionId,
          deviceId,
          transactionId:  msg.transactionId,
          startTime:      new Date(msg.startTime),
          startDate:      msg.startTime.split("T")[0],
          energySelected: msg.energy_kWh,
          amountPaid:     msg.amountPaid,
          status:         "active",
        };
        // Only set userId if provided
        if (msg.userId) {
          try {
            upd.userId = mongoose.Types.ObjectId(msg.userId);
          } catch {}
        }

        const sessionDoc = await Session.findOneAndUpdate(
          { sessionId: msg.sessionId },
          { $setOnInsert: upd },
          { upsert: true, new: true }
        );

        // Mark the device as occupied
        await Device.findOneAndUpdate(
          { device_id: deviceId },
          { status: "Occupied", current_session_id: sessionDoc._id }
        );
      }
      else if (section === "session" && action === "live") {
        await Session.updateOne(
          { sessionId: msg.sessionId },
          { energyConsumed: msg.energy_kWh }
        );
      }
      else if (section === "session" && action === "end") {
        const sess = await Session.findOneAndUpdate(
          { sessionId: msg.sessionId },
          {
            endTime:        new Date(msg.endTime || msg.timestamp),
            energyConsumed: msg.energy_kWh,
            status:         "completed",
            endTrigger:     msg.endTrigger || "auto",
          },
          { new: true }
        );
        // Free up the device
        await Device.findOneAndUpdate(
          { device_id: sess.deviceId },
          { status: "Available", current_session_id: null }
        );
      }
      else if (section === "status") {
        await Device.updateOne(
          { device_id: deviceId },
          { status: msg.status }
        );
      }

      console.log(`✅ Processed ${topic}`);
    } catch (err) {
      console.error(`❌ Error handling ${topic}:`, err);
    }
  });

  client.on("error", err => console.error("❌ MQTT client error:", err));
}

module.exports = startMqttSubscriber;
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

  client.on('message', async (topic, payload) => {
    try {
      const msg = JSON.parse(payload.toString());
      const [, deviceId, subTopic] = topic.split('/'); // e.g. ['device','GLIDE03','status']

      switch (subTopic) {
        case 'sessionCommand':
          // only handle start commands from charger
          if (msg.command === 'start') {
            // create session if not exists
            await Session.updateOne(
              { sessionId: msg.sessionId },
              {
                $setOnInsert: {
                  sessionId: msg.sessionId,
                  deviceId,
                  transactionId: msg.transactionId,
                  userId: msg.userId || null,
                  startTime: new Date(msg.startTime),
                  startDate: msg.startDate,
                  energySelected: msg.energySelected,
                  amountPaid: msg.amountPaid,
                  status: 'active',
                }
              },
              { upsert: true }
            );
            // update device to occupied
            await Device.updateOne(
              { device_id: deviceId },
              { status: 'Occupied', current_session_id: (await Session.findOne({ sessionId: msg.sessionId }))._id }
            );
          }
          break;

        case 'session':
          // this is 'session/live' or 'session/end' depending on second token
          if (topic.endsWith('/session/live')) {
            await Session.updateOne(
              { sessionId: msg.sessionId },
              {
                energyConsumed: msg.energy_kWh,
                // optionally store power & timestamp in a sub‐document array
                $push: { telemetry: { power_W: msg.power_W, timestamp: new Date(msg.timestamp) } }
              }
            );
          } else if (topic.endsWith('/session/end')) {
            await Session.updateOne(
              { sessionId: msg.sessionId },
              {
                endTime: new Date(msg.endTime || msg.timestamp),
                energyConsumed: msg.energy_kWh,
                status: 'completed',
                endTrigger: msg.endTrigger || 'auto'
              }
            );
            // free the device
            const sess = await Session.findOne({ sessionId: msg.sessionId });
            await Device.updateOne(
              { device_id: sess.deviceId },
              { status: 'Available', current_session_id: null }
            );
          }
          break;

        case 'status':
          // msg = { deviceId, status }
          await Device.updateOne(
            { device_id: deviceId },
            { status: msg.status.charAt(0).toUpperCase() + msg.status.slice(1) }
          );
          break;

        case 'session':
          // handled above
          break;

        case 'session/info':
          // initial session‐info metadata
          await Session.updateOne(
            { sessionId: msg.sessionId },
            {
              startEnergy:   msg.energy_kWh,
              amountPaid:    msg.amountPaid,
              userId:        msg.userId || undefined,
            }
          );
          break;
      }
      console.log(`✅ [${topic}] processed`);
    } catch (e) {
      console.error(`❌ Error processing MQTT ${topic}:`, e);
    }
  });

  client.on('error', err => console.error('❌ MQTT client error:', err));
}

module.exports = startMqttSubscriber;

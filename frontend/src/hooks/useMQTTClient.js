import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";


const HOST = "223f72957a1c4fa48a3ae815c57aab34.s1.eu.hivemq.cloud";
const WS_PORT = 8884;
const WS_PATH = "/mqtt";    // exactly what your HiveMQ Cloud instance uses

const CONNECTION_URL = `wss://${HOST}:${WS_PORT}${WS_PATH}`;

const OPTIONS = {
  username: "pritam",
  password: "Pritam123",
  clean: true,
  connectTimeout: 100000,
  reconnectPeriod: 10000,
  // protocolId/protocolVersion are optional in browser—
  // mqtt.js will default to the correct values for MQTT v3.1.1
};

export default function useMQTTClient(deviceId, onMessage) {
  const clientRef = useRef();
  const [connected, setConnected] = useState(false);

useEffect(() => {
  if (!deviceId) return;

  console.log("▶️ Connecting to", CONNECTION_URL);
  const client = mqtt.connect(CONNECTION_URL, OPTIONS);

  client.on("connect", () => {
    console.log("✅ MQTT WS connected");
    setConnected(true);

    const topics = [
      `device/${deviceId}/sensor/voltage`,
      `device/${deviceId}/sensor/current`,
      `device/${deviceId}/sensor/energy`,
      `device/${deviceId}/relay/state`,
    ];

    client.subscribe(topics, { qos: 1 }, err => {
      if (err) console.error("Subscribe failed", err);
    });
  });

  client.on("error", err => {
    console.error("❌ MQTT WS error:", err.message);
  });

  client.on("close", () => {
    console.warn("🔌 MQTT WS closed");
    setConnected(false);
  });

  client.on("message", (topic, message) => {
    onMessage(topic, message.toString());
  });



  return () => {
    client.end(true);
  };
}, [deviceId, onMessage]);


  const publish = (topic, msg) => {
    if (clientRef.current?.connected) 
      clientRef.current.publish(topic, msg, { qos:1, retain:false });
  };

  return { mqttClient: clientRef.current, connected, publish };
}

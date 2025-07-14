// src/hooks/useMQTTClient.js

import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";

const MQTT_BROKER_URL = "wss://223f72957a1c4fa48a3ae815c57aab34.s1.eu.hivemq.cloud:8884/mqtt";
const MQTT_USER = "pritam";
const MQTT_PASSWORD = "Pritam123";

export default function useMQTTClient(deviceId, onMessage) {
  const clientRef = useRef(null);
  const [connected, setConnected] = useState(false);

useEffect(() => {
    if (!deviceId) return;

    const client = mqtt.connect(MQTT_BROKER_URL, {
      username: MQTT_USER,
      password: MQTT_PASSWORD,
      rejectUnauthorized: false,
      reconnectPeriod: 2000,
    });

    clientRef.current = client;

    client.on("connect", () => {
      console.log("✅ MQTT WS connected");
      setConnected(true);
      client.subscribe([
        `device/${deviceId}/sensor/voltage`,
        `device/${deviceId}/sensor/current`,
        `device/${deviceId}/sensor/energy`,
        `device/${deviceId}/relay/state`
      ], { qos: 1 });
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

    clientRef.current = client;
    setMqttClient(client);

    return () => client.end(true);
  }, [deviceId, onMessage]);

  const publish = (topic, message) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish(topic, message);
    } else {
      console.warn("⚠️ Cannot publish — MQTT not connected");
    }
  };

  return { mqttClient: clientRef.current, connected, publish };
}

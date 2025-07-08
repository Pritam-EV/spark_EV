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

    const voltageTopic = `${deviceId}/voltage`;
    const currentTopic = `${deviceId}/current`;
    const relayTopic = `${deviceId}/relayState`;

    const client = mqtt.connect(MQTT_BROKER_URL, {
      username: MQTT_USER,
      password: MQTT_PASSWORD,
      rejectUnauthorized: false,
      reconnectPeriod: 2000,
    });

    clientRef.current = client;

    const handleConnect = () => {
      console.log("✅ MQTT Connected");
      setConnected(true);
      client.subscribe([voltageTopic, currentTopic, relayTopic]);
    };

    const handleMessage = (topic, message) => {
      const value = parseFloat(message.toString());
      onMessage(topic, value);
    };

    const handleError = (err) => {
      console.error("❌ MQTT Error:", err);
    };

    const handleClose = () => {
      console.warn("🔌 MQTT Disconnected");
      setConnected(false);
    };

    client.on("connect", handleConnect);
client.on("message", (topic, message) => {
  const value = message.toString(); // or parseFloat if needed
  if (onMessage) {
    onMessage(topic, value);
  }
});

    client.on("error", handleError);
    client.on("close", handleClose);

    return () => {
      console.log("🧹 Cleaning up MQTT client...");
      client.removeListener("connect", handleConnect);
      client.removeListener("message", handleMessage);
      client.removeListener("error", handleError);
      client.removeListener("close", handleClose);
      client.end(true);
    };
  }, [deviceId]);

  const publish = (topic, message) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish(topic, message);
    } else {
      console.warn("⚠️ Cannot publish — MQTT not connected");
    }
  };

  return { mqttClient: clientRef.current, connected, publish };
}

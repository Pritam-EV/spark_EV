import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";

const MQTT_BROKER_URL = "wss://223f72957a1c4fa48a3ae815c57aab34.s1.eu.hivemq.cloud:8884/mqtt";
const MQTT_USER = "pritam";
const MQTT_PASSWORD = "Pritam123";

export default function useMQTTClient(deviceId, onMessage) {
  const clientRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [mqttClient, setMqttClient] = useState(null);  // ✅ Reactive client
  useEffect(() => {
    if (!deviceId) return;  

    const topics = [
      `${deviceId}/sensor/voltage`,
      `${deviceId}/sensor/current`,
      `${deviceId}/relayState`,
      `${deviceId}/sensor/energy`
    ];

const client = mqtt.connect(MQTT_BROKER_URL, {
  clientId: `webclient_${Math.random().toString(16).substr(2, 8)}`,
  username: MQTT_USER,
  password: MQTT_PASSWORD,
  protocolId: 'MQTT',
  protocolVersion: 4,
  rejectUnauthorized: false,
  reconnectPeriod: 1000,
  connectTimeout: 5000,
  clean: true,
});



    clientRef.current = client;
setMqttClient(client);  // ✅ make reactive
    const handleConnect = () => {
      console.log("✅ MQTT Connected");
      setConnected(true);
      client.subscribe(topics, (err) => {
        if (err) console.error("❌ MQTT subscribe error:", err);
      });
    };

    const handleMessage = (topic, message) => {
      const msgStr = message.toString();
      if (onMessage) onMessage(topic, msgStr);
    };

    const handleError = (err) => {
      console.error("❌ MQTT Error:", err);
    };

    const handleClose = () => {
      console.warn("🔌 MQTT Disconnected");
      setConnected(false);
    };

    const handleReconnect = () => {
      console.log("🔄 MQTT Reconnecting...");
    };

    const handleOffline = () => {
      console.log("⚠️ MQTT Offline");
      setConnected(false);
    };

    client.on("connect", handleConnect);
    client.on("message", handleMessage);
    client.on("error", handleError);
    client.on("close", handleClose);
    client.on("reconnect", handleReconnect);
    client.on("offline", handleOffline);

    return () => {
      console.log("🧹 Cleaning up MQTT client...");
      client.removeListener("connect", handleConnect);
      client.removeListener("message", handleMessage);
      client.removeListener("error", handleError);
      client.removeListener("close", handleClose);
      client.removeListener("reconnect", handleReconnect);
      client.removeListener("offline", handleOffline);
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

return { mqttClient, connected, publish };

}

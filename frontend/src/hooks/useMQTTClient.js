import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";

const BROKER = "wss://223f72957a1c4fa48a3ae815c57aab34.s1.eu.hivemq.cloud:8884/mqtt";
const OPTS = {
  username: "pritam",
  password: "Pritam123",
  reconnectPeriod: 1000,
  connectTimeout: 5000,
  clean: true,
  rejectUnauthorized: false,
};

export default function useMQTTClient(deviceId, onMessage) {
  const clientRef = useRef();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    const client = mqtt.connect(BROKER, { ...OPTS, clientId:`web_${deviceId}_${Date.now()}` });
    clientRef.current = client;

    const topics = [
      `device/${deviceId}/sensor/voltage`,
      `device/${deviceId}/sensor/current`,
      `device/${deviceId}/sensor/energy`,
      `device/${deviceId}/relay/state`
    ];

    client.on("connect", () => {
      setConnected(true);
      client.subscribe(topics, { qos:1 });
    });
    client.on("message", (t, m) => onMessage(t, m.toString()));
    client.on("close", ()=> setConnected(false));

    return () => client.end(true);
  }, [deviceId, onMessage]);

  const publish = (topic, msg) => {
    if (clientRef.current?.connected) 
      clientRef.current.publish(topic, msg, { qos:1, retain:false });
  };

  return { mqttClient: clientRef.current, connected, publish };
}

import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";


const MQTT_HOST = '223f72957a1c4fa48a3ae815c57aab34.s1.eu.hivemq.cloud';
const MQTT_PORT = 8884;      // your HiveMQ WebSocket port
const MQTT_PATH = '/mqtt';   // HiveMQ’s default WS path

const options = {
  protocol: 'wss',
  host: MQTT_HOST,
  port: MQTT_PORT,
  path: MQTT_PATH,
  username: 'pritam',
  password: 'Pritam123',
  reconnectPeriod: 1000,
  connectTimeout: 5000,
  clean: true,
  rejectUnauthorized: false,  // dev only
};

export default function useMQTTClient(deviceId, onMessage) {
  const clientRef = useRef();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    const client = mqtt.connect(options);
    clientRef.current = client;

    const topics = [
      `device/${deviceId}/sensor/voltage`,
      `device/${deviceId}/sensor/current`,
      `device/${deviceId}/sensor/energy`,
      `device/${deviceId}/relay/state`
    ];

    client.on("connect", () => {
            console.log('✅ MQTT Connected');
      setConnected(true);
      client.subscribe(topics, { qos:1 });
    });
    client.on('message', (t, m) => onMessage(t, m.toString()));
    client.on('close', () => setConnected(false));
    client.on('error', err => console.error('MQTT Error', err));


    return () => client.end(true);
  }, [deviceId, onMessage]);

  const publish = (topic, msg) => {
    if (clientRef.current?.connected) 
      clientRef.current.publish(topic, msg, { qos:1, retain:false });
  };

  return { mqttClient: clientRef.current, connected, publish };
}

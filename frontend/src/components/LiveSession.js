import React, { useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';
import { Box, Button, Typography, Card, LinearProgress } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import FooterNav from "../components/FooterNav";
const MQTT_BROKER_URL = "wss://223f72957a1c4fa48a3ae815c57aab34.s1.eu.hivemq.cloud:8884/mqtt";
const MQTT_USER = "pritam";
const MQTT_PASSWORD = "Pritam123";

function LiveSessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId, deviceId, energySelected, amountPaid } = location.state || {};
  const [relayState, setRelayState] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [voltage, setVoltage] = useState(0);
  const [current, setCurrent] = useState(0);
  const [energyConsumed, setEnergyConsumed] = useState(0);

const mqttClient = useRef(null);  

  useEffect(() => {
    // Fetch device details
    fetch(`/api/devices/${deviceId}`)
      .then(res => res.json())
      .then(data => setDeviceInfo(data));



    // Connect to MQTT
    const client = mqtt.connect(MQTT_BROKER_URL, {
      username: MQTT_USER,
      password: MQTT_PASSWORD,
      rejectUnauthorized: false
    });
    
  mqttClient.current = client;  

    client.on('connect', () => {
      client.subscribe(`device/${deviceId}/session/live`);
      client.subscribe(`device/${deviceId}/session/end`);
      client.subscribe(`device/${deviceId}/relay/state`);
    });
client.on('message', (topic, buf) => {
  const payload = buf.toString();

  if (topic.endsWith('/relay/state')) {
    // payload is just "ON" or "OFF"
    console.log('Relay state:', payload);
    setRelayState(payload);
    return;
  }

  // Now only parse JSON for the other topics
  let data;
  try {
    data = JSON.parse(payload);
  } catch (err) {
    console.warn(`Skipping non-JSON payload on ${topic}:`, payload);
    return;
  }

  if (topic.endsWith('/session/live')) {
    // handle data.energy_kWh, data.power_W, etc.
    setEnergyConsumed(data.energy_kWh);
  if (typeof data.voltage === 'number') setVoltage(data.voltage);
  if (typeof data.current === 'number') setCurrent(data.current);
      } else if (topic.endsWith('/session/end')) {
        // Session ended, navigate to summary
        navigate(`/session-summary/${sessionId}`, { state:{ sessionData: data } });
      }
      // handle other topics if needed
    });
    return () => client.end();
  }, [deviceId, navigate, sessionId]);

  const handleStop = async () => {
    const endTime = new Date().toISOString();
    // Notify backend to stop session
    await fetch('/api/sessions/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ sessionId, endTime, endTrigger: 'manual', deviceId })
    });
    // Publish MQTT stop command
    const stopCmd = { command: "stop", sessionId, deviceId, endTime };
     mqttClient.current.publish(`device/${deviceId}/sessionCommand`, JSON.stringify(stopCmd));
    // After confirming stop, navigate to summary
    navigate(`/session-summary/${sessionId}`, { state: { ended: true } });
  };

  const usagePercent = (energyConsumed / energySelected) * 100;

  return (
    <Box sx={{ p: 3, background: "#0b0e13", minHeight: "100vh" }}>
      {deviceInfo && (
        <Card sx={{ p: 2, mb: 3, background: "linear-gradient(to right, #1e2c3a, #243745)", color: "#e1f5f5" }}>
          <Typography variant="subtitle1">
            Connected to {deviceInfo.device_id} – {deviceInfo.location} – {deviceInfo.charger_type}
          </Typography>
        </Card>
      )}
      {/* Progress bar for energy usage */}
      <Typography variant="body2" sx={{ color: "#7de0dd", mb: 1 }}>
        Used: {energyConsumed.toFixed(2)} kWh / {energySelected} kWh
      </Typography>
      <LinearProgress 
        variant="determinate" 
        value={usagePercent} 
        sx={{ height: 12, borderRadius: 6, backgroundColor: "#2c4c57", '& .MuiLinearProgress-bar': { backgroundColor: "#04BFBF" } }} 
      />
      {/* Live stats */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ color: "#7de0dd" }}>
          Voltage: {voltage.toFixed(1)} V
        </Typography>
        <Typography variant="h6" sx={{ color: "#7de0dd" }}>
          Current: {current.toFixed(1)} A
        </Typography>
        <Typography variant="h6" sx={{ color: "#e1f5f5" }}>
          Energy Consumed: {energyConsumed.toFixed(3)} kWh
        </Typography>
      </Box>
      {/* Stop Charging button */}
      <Box sx={{ mt: 6, textAlign: 'center' }}>
        <Button 
          variant="contained" 
          color="error" 
          onClick={handleStop}
          sx={{ padding: "14px 28px", fontSize: "0.9rem", borderRadius: "40px", boxShadow: "0 0 12px rgba(242,160,7,0.6)" }}
        >
          STOP CHARGING
        </Button>
      </Box>
            <FooterNav />
    </Box>
    
  );
}

export default LiveSessionPage;

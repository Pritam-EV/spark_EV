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

  const usagePercent = Math.min((energyConsumed / energySelected) * 100, 100);
  const mqttClient = useRef(null);

  useEffect(() => {
    // Fetch device details
    fetch(`/api/devices/${deviceId}`)
      .then(res => res.json())
      .then(data => setDeviceInfo(data))
      .catch(err => console.error("Failed to fetch device info:", err));

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
        setRelayState(payload);
        return;
      }
      let data;
      try {
        data = JSON.parse(payload);
      } catch (err) {
        console.warn(`Non-JSON payload on ${topic}:`, payload);
        return;
      }
      if (topic.endsWith('/session/live')) {
        setEnergyConsumed(data.energy_kWh);
        setVoltage(data.voltage ?? voltage);
        setCurrent(data.current ?? current);
      } else if (topic.endsWith('/session/end')) {
        // handle session end if needed
      }
    });

    return () => {
      client.end();
    };
  }, [deviceId, navigate, sessionId]);

  const handleStop = async () => {
    const endTime = new Date().toISOString();
    await fetch('/api/sessions/stop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ sessionId, endTime, endTrigger: 'manual', deviceId })
    });
    const stopCmd = { command: "stop", sessionId, deviceId, endTime };
    mqttClient.current.publish(`device/${deviceId}/sessionCommand`, JSON.stringify(stopCmd));
    navigate(`/session-summary/${sessionId}`, { state: { ended: true } });
  };

  const carContainerStyle = {
    position: 'relative',
    width: '220px',
    height: '120px',
    margin: '0 auto',
  };
  const carImageStyle = {
    position: 'absolute',
    bottom: 0,
    width: '220px',
    height: '120px',
    zIndex: 2,
    pointerEvents: 'none',
  };
  const fillStyle = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: `${usagePercent}%`,
    backgroundColor: '#04BFBF',
    transition: 'height 0.5s ease',
    zIndex: 1,
  };

  return (
    <div style={{ color: '#fff', backgroundColor: '#172D32', padding: '20px' }}>
      {/* Car Fill UI */}
      <div style={carContainerStyle}>
        <img src="/car2.png" alt="Car" style={carImageStyle} />
        <div style={fillStyle}></div>
      </div>
      <Box sx={{ p: 3, background: "#0b0e13", minHeight: "100vh" }}>
        {deviceInfo && (
          <Card sx={{ p: 2, mb: 3, background: "linear-gradient(to right, #1e2c3a, #243745)", color: "#e1f5f5" }}>
            <Typography variant="subtitle1">
              Connected to {deviceInfo.device_id} – {deviceInfo.location} – {deviceInfo.charger_type}
            </Typography>
          </Card>
        )}
        <Typography variant="body2" sx={{ color: "#7de0dd", mb: 1 }}>
          Used: {energyConsumed.toFixed(2)} kWh / {energySelected} kWh
        </Typography>
        <LinearProgress
          variant="determinate"
          value={usagePercent}
          sx={{
            height: 12,
            borderRadius: 6,
            backgroundColor: "#2c4c57",
            '& .MuiLinearProgress-bar': { backgroundColor: "#04BFBF" }
          }}
        />
        <div style={{ textAlign: 'center', marginTop: '10px', marginBottom: '20px' }}>
          Used: {energyConsumed.toFixed(2)} kWh / {energySelected} kWh
        </div>

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
    </div>
  );
}

export default LiveSessionPage;

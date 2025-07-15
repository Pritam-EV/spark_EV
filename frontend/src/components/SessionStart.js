import React, { useEffect, useRef } from 'react';
import mqtt from 'mqtt';
import { Button, Box, Typography } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

const MQTT_BROKER_URL = "wss://223f72957a1c4fa48a3ae815c57aab34.s1.eu.hivemq.cloud:8884/mqtt";
const MQTT_USER = "pritam";
const MQTT_PASSWORD = "Pritam123";

function SessionStartPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { deviceId, userId, energySelected, amountPaid, transactionId } = location.state || {};
  const sessionId = uuidv4();

  const mqttClient = useRef(null);   

  useEffect(() => {
    // Connect to MQTT
    const client = mqtt.connect(MQTT_BROKER_URL, {
      username: MQTT_USER,
      password: MQTT_PASSWORD,
      rejectUnauthorized: false,
      reconnectPeriod: 2000
    });
    mqttClient.current = client; 

    client.on('connect', () => {
      client.subscribe(`device/${deviceId}/sessionCommand`);
      console.log("Subscribed to sessionCommand");
    });
    // Clean up on unmount
    return () => client.end();
  }, [deviceId]);

  const handleStart = async () => {
    const now = new Date();
    const startTime = now.toISOString();
    const startDate = now.toISOString().split('T')[0];
    // Send to backend API
    await fetch('/api/sessions/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ sessionId, deviceId, userId, startTime, startDate, energySelected, amountPaid, transactionId })
    });
    // Publish MQTT start command
    const startCmd = {
      command: "start",
      sessionId, deviceId, userId, startTime, startDate,
      energySelected, amountPaid, transactionId,
      sessionstatus: "started"
    };
    mqttClient.current.publish(`device/${deviceId}/sessionCommand`, JSON.stringify(startCmd));
    // Go to LiveSession page
    navigate(`/live-session/${sessionId}`, { state: { sessionId, deviceId } });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4, background: "linear-gradient(145deg, #0b0e13, #111a21)" }}>
      {/* Placeholder for EV charger image */}
      <Box component="img" src="/assets/ev_charger_icon.png" alt="EV Charging" sx={{ width: 200, mb: 4 }} />
      <Button 
        variant="contained" 
        onClick={handleStart}
        sx={{
          borderRadius: "50%", width: 120, height: 120,
          backgroundColor: "#04BFBF", color: "#0b0e13",
          fontWeight: "bold", fontSize: "1rem",
          boxShadow: "0 0 10px #04BFBF",
          animation: "pulse 2s infinite"
        }}
      >
        START<br/>CHARGING
      </Button>
    </Box>
  );
}

export default SessionStartPage;

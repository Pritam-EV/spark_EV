// src/components/SessionStart.js

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import mqtt from 'mqtt';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';

const API_BASE        = process.env.REACT_APP_API_BASE || '';
const MQTT_BROKER_URL = 'wss://223f72957a1c4fa48a3ae815c57aab34.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_USER       = 'pritam';
const MQTT_PASSWORD   = 'Pritam123';

export default function SessionStartPage() {
  const { deviceId, transactionId } = useParams();
  const location                    = useLocation();
  const navigate                    = useNavigate();
  const sessionIdRef                = useRef(uuidv4());
  const createdRef                  = useRef(false);            // to run once
  const startTimeRef                = useRef(new Date().toISOString());
  const startDateRef                = useRef(startTimeRef.current.split('T')[0]);
  const mqttClient                  = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const energySelected = location.state?.energySelected;
  const amountPaid     = location.state?.amountPaid;
  const userId         = localStorage.getItem('user') || null;

  // 1) Create session only once
  useEffect(() => {
    if (createdRef.current) return;                      // already ran
    createdRef.current = true;

    if (!deviceId || !transactionId || energySelected == null || amountPaid == null) {
      setError('Missing parameters.');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/sessions/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            sessionId:      sessionIdRef.current,
            deviceId,
            userId,
            startTime:      startTimeRef.current,
            startDate:      startDateRef.current,
            energySelected,
            amountPaid,
            transactionId,
          }),
        });

        // If duplicate transaction, treat as success
        if (resp.status === 409) {
          console.warn('⚠️ Session already created.');
          setLoading(false);
          return;
        }

        if (!resp.ok) {
          const ct = resp.headers.get('content-type') || '';
          let text = await (ct.includes('application/json') ? resp.json() : resp.text());
          text = typeof text === 'object' ? JSON.stringify(text) : text;
          throw new Error(text);
        }

        setLoading(false);
      } catch (err) {
        console.error('❌ Error creating session:', err);
        setError(err.message);
        setLoading(false);
      }
    })();
  }, [deviceId, transactionId, energySelected, amountPaid]);

  // 2) Connect to MQTT once
  useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER_URL, {
      username:        MQTT_USER,
      password:        MQTT_PASSWORD,
      rejectUnauthorized: false,
      reconnectPeriod: 2000,
    });
    mqttClient.current = client;

    client.on('connect', () => {
      console.log('🔌 MQTT connected (SessionStart)');
      client.subscribe(`device/${deviceId}/sessionCommand`, { qos: 1 });
    });
    client.on('error', err => console.error('❌ MQTT error:', err));
    return () => client.end();
  }, [deviceId]);

  // 3) Start button publishes the command
  const handleStart = () => {
    const cmd = {
      command:       'start',
      sessionId:     sessionIdRef.current,
      deviceId,
      userId,
      startTime:     startTimeRef.current,
      startDate:     startDateRef.current,
      energySelected,
      amountPaid,
      transactionId,
      sessionstatus: 'started',
    };
    mqttClient.current.publish(
      `device/${deviceId}/sessionCommand`,
      JSON.stringify(cmd),
      { qos: 1, retain: true }
    );
    navigate(`/live-session/${sessionIdRef.current}`, { state: { deviceId } });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" sx={{ background: '#0b0e13' }}>
        <CircularProgress size={60} sx={{ color: '#04BFBF' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
<Box
  sx={{
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    minHeight:      '100vh',
    background:     'linear-gradient(145deg, #0b0e13, #111a21)',
    p:              4,
  }}
>
  {/* ⚡️Instruction text above the GIF */}
  <Typography
    variant="h5"
    sx={{
      color: '#ffffff',
      fontWeight: 'bold',
      mb: 2,
      textAlign: 'center',
    }}
  >
    Plug in the charger
  </Typography>

  {/* 🔌 Enlarged GIF */}
  <img
    src="/sessionstart.jpg"
    alt="EV Charger Gun"
    style={{
      width: '600px',
      marginBottom: '80px',
    }}
  />

  <Button
    variant="contained"
    onClick={handleStart}
    sx={{
      borderRadius:    '50%',
      width:           120,
      height:          120,
      backgroundColor: '#04BFBF',
      color:           '#0b0e13',
      fontWeight:      'bold',
      fontSize:        '1rem',
      boxShadow:       '0 0 10px #04BFBF',
      animation:       'pulse 2s infinite',
    }}
  >
    START<br />CHARGING
  </Button>

  <style>
    {`@keyframes pulse {
        0%   { box-shadow: 0 0 10px rgba(4,191,191,0.5); }
        50%  { box-shadow: 0 0 25px rgba(4,191,191,0.9); }
        100% { box-shadow: 0 0 10px rgba(4,191,191,0.5); }
      }`}
  </style>
</Box>


  );
}

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
  const location  = useLocation();
  const navigate  = useNavigate();

  // ids / refs
  const sessionIdRef    = useRef(uuidv4());
  const createdRef      = useRef(false);        // POST /start fired
  const sessionReadyRef = useRef(false);        // HTTP finished (ok or 409)
  const mqttReadyRef    = useRef(false);        // MQTT connected
  const readyRef        = useRef(false);        // both ready -> countdown
  const startedRef      = useRef(false);        // start already sent

  // timestamps
  const startTimeRef = useRef(new Date().toISOString());
  const startDateRef = useRef(startTimeRef.current.split('T')[0]);

  // mqtt
  const mqttClient = useRef(null);

  // UI state
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(10);

  // session values from previous page (fallback; ideally persist)
  const energySelected = location.state?.energySelected;
  const amountPaid     = location.state?.amountPaid;

  // user id from localStorage
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }})();
  const userId     = storedUser?._id || null;

  // helper: arm countdown when both http + mqtt ready
  const checkReady = () => {
    if (readyRef.current) return;
    if (sessionReadyRef.current && mqttReadyRef.current && !error) {
      readyRef.current = true;
      setSecondsLeft(10); // kick off countdown
    }
  };

  // create session once
  useEffect(() => {
    if (createdRef.current) return;
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

        if (resp.status === 409) {
          console.warn('⚠️ Session already created.');
          sessionReadyRef.current = true;
          setLoading(false);
          checkReady();
          return;
        }

        if (!resp.ok) {
          const ct   = resp.headers.get('content-type') || '';
          let detail = await (ct.includes('application/json') ? resp.json() : resp.text());
          detail     = typeof detail === 'object' ? JSON.stringify(detail) : detail;
          throw new Error(detail);
        }

        sessionReadyRef.current = true;
        setLoading(false);
        checkReady();
      } catch (err) {
        console.error('❌ Error creating session:', err);
        setError(err.message);
        setLoading(false);
      }
    })();
  }, [deviceId, transactionId, energySelected, amountPaid]);

  // mqtt connection
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
      mqttReadyRef.current = true;
      checkReady();
    });

    client.on('error', err => console.error('❌ MQTT error:', err));
    return () => client.end();
  }, [deviceId]);

  // countdown auto start
  useEffect(() => {
    if (!readyRef.current) return;
    if (startedRef.current) return;
    if (secondsLeft <= 0) {
      handleStart(); // auto
      return;
    }
    const id = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  // start (manual / auto)
  const handleStart = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setSecondsLeft(0);

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

    mqttClient.current?.publish(
      `device/${deviceId}/sessionCommand`,
      JSON.stringify(cmd),
      { qos: 1, retain: true }
    );

    navigate(`/live-session/${sessionIdRef.current}`, { state: { deviceId } });
  };

  // loading / error screens
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

  // main UI
  return (
    <Box
      sx={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        minHeight:      '100vh',
        background:     '#0a1117',
        p:              4,
      }}
    >
      <Typography
        variant="h6"
        sx={{ color: '#ffffff', mb: 8, textAlign: 'center' }}
      >
        Plug in the charger
      </Typography>

      {readyRef.current && !startedRef.current && (
        <Typography
          variant="body1"
          sx={{ color:'#04BFBF', mb:2, textAlign:'center' }}
        >
          Charging will start in {secondsLeft}s
        </Typography>
      )}

      <img
        src="/gun1.png"
        alt="EV Charger Gun"
        style={{ width: '250px', marginBottom: '80px' }}
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

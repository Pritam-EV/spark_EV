import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import mqtt from 'mqtt';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';

const MQTT_BROKER_URL = 'wss://223f72957a1c4fa48a3ae815c57aab34.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_USER       = 'pritam';
const MQTT_PASSWORD   = 'Pritam123';

export default function SessionStartPage() {
  const { deviceId, transactionId } = useParams();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  // Stable IDs & refs
  const sessionIdRef    = useRef(uuidv4());
  const createdRef      = useRef(false);   // API start fired
  const sessionReadyRef = useRef(false);   // backend session created (or exists)
  const mqttReadyRef    = useRef(false);   // MQTT connected
  const startedRef      = useRef(false);   // start command already sent

  // Stable timestamps (captured once on entry)
  const startTimeRef = useRef(new Date().toISOString());
  const startDateRef = useRef(startTimeRef.current.split('T')[0]);

  // MQTT instance
  const mqttClient = useRef(null);

  // UI state
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [isReady,     setIsReady]     = useState(false); // reactive readiness

  // Values from previous navigation state (amount/energy)
  const energySelected = location.state?.energySelected;
  const amountPaid     = location.state?.amountPaid;

  // Parse user from localStorage
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('user')); }
    catch { return null; }
  })();
  const userId = storedUser?._id || null;

  /* ------------------------------------------------------------------
   *  Helper: Arm the countdown once both backend & MQTT are ready
   * ---------------------------------------------------------------- */
  const checkReady = () => {
    console.log('checkReady()', {
      sessionReady: sessionReadyRef.current,
      mqttReady:    mqttReadyRef.current,
      error,
    });
    if (isReady) return;
    if (sessionReadyRef.current && mqttReadyRef.current && !error) {
      console.log('✅ Both ready, starting countdown…');
      setIsReady(true);
      setSecondsLeft(10); // reset & start
    }
  };

  /* ------------------------------------------------------------------
   * 1. Create session in backend (runs once)
   * ---------------------------------------------------------------- */
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
        const resp = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/start`, {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            Authorization:   `Bearer ${localStorage.getItem('token')}`,
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
          console.warn('⚠️ Session already exists for this transaction.');
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, transactionId, energySelected, amountPaid]);

  /* ------------------------------------------------------------------
   * 2. Connect MQTT (runs once per deviceId)
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER_URL, {
      username:          MQTT_USER,
      password:          MQTT_PASSWORD,
      rejectUnauthorized:false,
      reconnectPeriod:   2000,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  /* ------------------------------------------------------------------
   * 3. Countdown effect
   * ---------------------------------------------------------------- */
  useEffect(() => {
    if (!isReady) return;
    if (startedRef.current) return;

    if (secondsLeft <= 0) {
      handleStart(); // auto start
      return;
    }

    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [isReady, secondsLeft]); // deliberately omitting handleStart ref to avoid resets

  /* ------------------------------------------------------------------
   * 4. Start charging (manual or auto)
   * ---------------------------------------------------------------- */
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

  /* ------------------------------------------------------------------
   * 5. Loading / Error states
   * ---------------------------------------------------------------- */
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{ background: '#0b0e13' }}
      >
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

  /* ------------------------------------------------------------------
   * 6. Main UI
   * ---------------------------------------------------------------- */
  return (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0a1117',
      px: 2,
    }}
  >
    {/* Instruction Text */}
    <Typography
      variant="h6"
      sx={{
        color: '#ffffff',
        mb: { xs: 1, sm: 2 }, // ✅ smaller gap on mobile
        textAlign: 'center',
        fontWeight: 600,
        fontSize: { xs: '1.1rem', sm: '1.3rem' }, // ✅ responsive font size
      }}
    >
      Plug in the charger
    </Typography>

    {/* Charger Image */}
    <img
      src="/gun1.png"
      alt="EV Charger Gun"
      loading="eager"
      onLoad={() => setImageLoaded(true)}
      style={{
        width: '200px', // ✅ slightly smaller for mobile
        marginBottom: '12px', // ✅ reduced gap
        opacity: imageLoaded ? 1 : 0,
        transition: 'opacity 0.3s ease-in',
      }}
    />

    {/* Loader when image is loading */}
    {!imageLoaded && (
      <CircularProgress sx={{ color: '#04BFBF', mb: 2 }} />
    )}

    {/* Countdown Text */}
    {isReady && !startedRef.current && (
      <Typography
        variant="body1"
        sx={{
          color: '#04BFBF',
          mt: 8, // ✅ reduced gap before button
          fontSize: { xs: '0.95rem', sm: '1rem' },
          textAlign: 'center',
        }}
      >
        Charging will start in {secondsLeft}s
      </Typography>
    )}

    {/* Start Now Button */}
    <Button
      variant="contained"
      onClick={handleStart}
      sx={{
        mt: 3, // ✅ no extra margin on mobile
        borderRadius: '50%',
        width: { xs: 100, sm: 120 }, // ✅ slightly smaller for mobile
        height: { xs: 100, sm: 120 },
        backgroundColor: '#04BFBF',
        color: '#ffff',
        fontWeight: 'bold',
        fontSize: { xs: '0.9rem', sm: '1rem' }, // ✅ responsive font
        boxShadow: '0 0 15px #04BFBF',
        animation: 'pulse 2s infinite',
      }}
    >
      START<br />NOW
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
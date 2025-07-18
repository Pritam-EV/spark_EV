import React, { useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';
import { useNavigate, useLocation } from 'react-router-dom';

export default function LiveSessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // Extract session data from location.state
  const {
    sessionId,
    deviceId,
    energySelected,
    amountPaid,
    chargerId,
    transactionId,
    startDate,
    startTime
  } = location.state || {};
const API_BASE = process.env.REACT_APP_API_BASE || 'https://spark-ev-backend.onrender.com';

  // State variables
  const [relayState, setRelayState] = useState('OFF');
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [voltage, setVoltage] = useState(0);
  const [current, setCurrent] = useState(0);
  const [energyConsumed, setEnergyConsumed] = useState(0);
  const [showPopup, setShowPopup] = useState(false);

  // Compute fill percentage and check if full
  const usagePercent = energySelected
    ? Math.min((energyConsumed / energySelected) * 100, 100)
    : 0;
  const isFull = usagePercent >= 100;
  // Compute amount utilized (portion of amountPaid for energyConsumed)
  const amountUtilized = energySelected
    ? ((energyConsumed / energySelected) * amountPaid).toFixed(2)
    : '0.00';

  const mqttClient = useRef(null);
  const relayRef = useRef(relayState);
  // Keep a ref to the latest relayState for interval logging
  useEffect(() => {
    relayRef.current = relayState;
  }, [relayState]);

  useEffect(() => {
    // Fetch device details from backend
    if (deviceId) {
      fetch(`/api/devices/${deviceId}`)
        .then(res => res.json())
        .then(data => {
          console.log('Device info:', data);
          setDeviceInfo(data);
        })
        .catch(err => console.error('Error fetching device info:', err));
    }

    // Connect to MQTT broker
    const client = mqtt.connect("wss://223f72957a1c4fa48a3ae815c57aab34.s1.eu.hivemq.cloud:8884/mqtt", {
      username: "pritam",
      password: "Pritam123",
      rejectUnauthorized: false
    });
    mqttClient.current = client;

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      // Subscribe to live session, end session, and relay state topics
      client.subscribe(`device/${deviceId}/session/live`);
      client.subscribe(`device/${deviceId}/session/end`);
      client.subscribe(`device/${deviceId}/relay/state`);
      console.log(`Subscribed to device/${deviceId}/session/live`);
      console.log(`Subscribed to device/${deviceId}/session/end`);
      console.log(`Subscribed to device/${deviceId}/relay/state`);
    });

    client.on('message', (topic, buf) => {
      const payload = buf.toString();
      if (topic.endsWith('/relay/state')) {
        console.log('Relay state message received:', payload);
        setRelayState(payload); // Update charging status
        return;
      }
      let data;
      try {
        data = JSON.parse(payload);
      } catch (err) {
        console.warn(`Skipping non-JSON payload on ${topic}:`, payload);
        return;
      }
      if (topic.endsWith('/session/live')) {
        console.log('Live session data received:', data);
        // Update live metrics
        setEnergyConsumed(data.energy_kWh);
        if (data.voltage !== undefined) setVoltage(data.voltage);
        if (data.current !== undefined) setCurrent(data.current);
      } else if (topic.endsWith('/session/end')) {
        console.log('Session ended payload received:', data);
        // Optionally handle session end (navigation etc.)
      }
    });

    return () => {
      client.end();
    };
  }, [deviceId]);

  // Log the current relay state every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Current relay state:', relayRef.current);
    }, 5000);
    return () => clearInterval(interval);
  }, []);



  const handleStop = async () => {
    const endTime = new Date().toISOString();
    // Notify backend to stop the session
    console.log('Stopping session, sending stop command...');


  try {
    // Send MQTT stop command
    const stopCommand = {
      command: 'stop',
      sessionId,
      deviceId,
      endTrigger: 'manual',
    };

    mqttClient.current?.publish(
      `device/${deviceId}/sessionCommand`,
      JSON.stringify(stopCommand),
      { qos: 1, retain: true }
    );
    console.log('📡 MQTT stop command published:', stopCommand);

    // Also send REST stop request to backend
    const response = await fetch(`${API_BASE}/api/sessions/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        sessionId,
        deviceId,
        endTime: new Date().toISOString(),
        endTrigger: 'manual',
        currentEnergy,
        deltaEnergy,
        amountUsed,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`❌ Backend stop failed: ${errorText}`);
    }

    console.log('✅ Session stopped successfully');
    navigate('/session-summary', { state: { sessionId } });
  } catch (err) {
    console.error('❌ Error stopping session:', err);
    alert('Failed to stop session. Please try again.');
  }
};

  return (
    <>
      <style>{`
        :root {
          --fill-green: #01d146;
          --wave1-color: rgba(0, 200, 83, 0.85);
          --wave2-color: rgba(5, 177, 76, 0.55);
        }
        .ev-screen {
          min-height: 100vh;
          background-color: white;
          background-image: url('/background.jpg');
          background-size: cover;
          background-repeat: no-repeat;
          background-position: center;
          padding: 60px 20px 20px;
          color: white;
          font-family: sans-serif;
          position: relative;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 25px;
        }
        .charging-status {
          margin-bottom: 20px;
          font-size: 1.2em;
        }
        .on {
          color: #0f0;
        }
        .off {
          color: red;
        }
        .car-container {
          position: relative;
          width: 300px;
          height: 150px;
          margin: 40px auto 30px;
          background: url('/car2.png') center/contain no-repeat;
          -webkit-mask: url('/car2.png') center/contain no-repeat;
          mask: url('/car2.png') center/contain no-repeat;
          overflow: hidden;
        }
        .fill {
          position: absolute;
          bottom: 0;
          width: 100%;
          height: ${usagePercent}%;
          transition: height 1s linear;
          background: ${isFull ? 'var(--fill-green)' : 'linear-gradient(to top, #02d814cc, #01b41980)'};
          z-index: 1;
        }
        .fill-glow {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            to top,
            rgba(0,255,120,0.8) 0%,
            rgba(0,255,120,0.2) 8%,
            transparent 12%
          );
          background-size: 100% 40px;
          animation: glowMove 1.5s linear infinite;
          mix-blend-mode: screen;
          filter: blur(6px);
          opacity: 0.7;
          z-index: 0;
        }
        .wave-container {
          position: absolute;
          bottom: 0;
          width: 200%;
          height: 150%;
          transform: translateY(${(-0.15 * usagePercent).toFixed(2)}%);
          z-index: 2;
          opacity: ${isFull ? 0 : 1};
          pointer-events: none;
        }
        .glow-area {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 3;
          overflow: hidden;
        }
        .glow-line {
          position: absolute;
          bottom: -100%;
          left: 0;
          width: 100%;
          height: 300%;
          background: linear-gradient(
            to top,
            rgba(0, 200, 83, 0) 0%,
            rgba(0, 255, 120, 0.9) 50%,
            rgba(0, 200, 83, 0) 100%
          );
          mix-blend-mode: screen;
          opacity: 0.6;
          animation: glowSweep 1.8s linear infinite;
        }
        @keyframes glowSweep {
          0% { transform: translateY(100%); }
          100% { transform: translateY(-100%); }
        }
        @keyframes glowMove {
          0% { background-position: 0 100%; }
          100% { background-position: 0 0%; }
        }
        svg {
          position: absolute;
          bottom: 0;
          width: 200%;
          height: 100%;
        }
        .wave1 {
          fill: var(--wave1-color);
          animation: waveMove1 2.8s linear infinite;
        }
        .wave2 {
          fill: var(--wave2-color);
          animation: waveMove2 3.6s linear infinite;
        }
        @keyframes waveMove1 {
          0% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(-25%) translateY(-2%); }
          100% { transform: translateX(-50%) translateY(0); }
        }
        @keyframes waveMove2 {
          0% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(-12.5%) translateY(2%); }
          100% { transform: translateX(-25%) translateY(0); }
        }
        .info-block {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid white;
          border-radius: 25px;
          width: 90%;
          margin: 0 auto 20px;
        }
        .info-block .cell {
          padding: 15px;
        }
        .top-left {
          border-bottom: 1px solid white;
          border-right: 1px solid white;
          text-align: left;
        }
        .top-right {
          border-bottom: 1px solid white;
          text-align: right;
        }
        .bottom-left {
          border-right: 1px solid white;
          text-align: left;
        }
        .bottom-right {
          text-align: right;
        }
        .label {
          font-size: 0.8em;
          text-align: center;
        }
        .value {
          font-size: 1.5em;
          color: #04bfbf;
          text-align: center;
        }
        .voltage-current-block {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid white;
          border-radius: 25px;
          width: 90%;
          margin: 0 auto 20px;
          padding: 15px;
        }
        .more-info {
          text-align: center;
          text-decoration: underline;
          margin-top: 30px;
          cursor: pointer;
          color: #04bfbf;
          font-weight: bold;
        }
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          backdrop-filter: blur(8px);
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 100;
        }
        .popup-box {
          background: rgba(22, 22, 22, 0.5);
          border: 2px solid #026873;
          border-radius: 15px;
          padding: 20px 30px;
          width: 85%;
          max-width: 400px;
          color: #fff;
          position: relative;
        }
        .popup-box h3 {
          margin-bottom: 10px;
          color: #04bfbf;
        }
        .popup-box span {
          color: #04bfbf;
          font-weight: bold;
        }
        .close-btn {
          position: absolute;
          top: 8px;
          right: 12px;
          font-size: 20px;
          color: white;
          cursor: pointer;
        }
        .stop-charging {
          display: inline-block;
          padding: 12px 30px;
          background: #D32F2F;
          color: #fff;
          border: none;
          border-radius: 30px;
          font-weight: bold;
          cursor: pointer;
          margin-top: 20px;
        }
        .stop-charging:hover { background: #b71c1c; }
      `}</style>

      <div className="ev-screen">
        {/* Header */}
        <div className="header">
          <div>
            <p>You are connected to <strong>{deviceInfo ? deviceInfo.device_id : deviceId}</strong></p>
            <p>on {deviceInfo ? `${deviceInfo.location} ${deviceInfo.charger_type}` : ''}</p>
          </div>
        </div>

        {/* Charging status */}
        <p className="charging-status">
          <span className={relayState === 'ON' ? 'on' : 'off'}>
            Charging {relayState === 'ON' ? 'ON' : 'OFF'}
          </span>
        </p>

        {/* Car Fill Animation */}
        <div className="car-container">
          <div className="glow-area"><div className="glow-line"></div></div>
          <div className="fill">
            <div className="fill-glow"></div>
            <div className="wave-container">
              <svg viewBox="0 0 1200 150" preserveAspectRatio="none">
                <path className="wave1" d="M0,110 C150,140 300,80 450,110 C600,140 750,80 900,110 C1050,140 1150,80 1200,110 L1200,150 L0,150 Z"></path>
              </svg>
              <svg viewBox="0 0 1200 150" preserveAspectRatio="none">
                <path className="wave2" d="M0,100 C150,130 300,70 450,100 C600,130 750,70 900,100 C1050,130 1150,70 1200,100 L1200,150 L0,150 Z"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* Info blocks (Energy and Amounts) */}
        <div className="info-block">
          <div className="cell top-left">
            <div className="label">Energy Consumed</div>
            <div className="value">{energyConsumed.toFixed(2)}</div>
          </div>
          <div className="cell top-right">
            <div className="label">Energy Selected</div>
            <div className="value">{Number(energySelected).toFixed(2)}</div>
          </div>
          <div className="cell bottom-left">
            <div className="label">Amount Utilized</div>
            <div className="value">{amountUtilized}</div>
          </div>
          <div className="cell bottom-right">
            <div className="label">Amount Paid</div>
            <div className="value">{amountPaid}</div>
          </div>
        </div>

        {/* Voltage & Current */}
        <div className="voltage-current-block">
          <div>
            <div className="value">{voltage.toFixed(1)}V</div>
            <div className="label">Voltage</div>
          </div>
          <div>
            <div className="value">{current.toFixed(1)}A</div>
            <div className="label">Current</div>
          </div>
        </div>

        {/* More Info popup trigger */}
        <p className="more-info" onClick={() => setShowPopup(true)}>more info</p>

        {/* Popup with session details */}
        {showPopup && (
          <div className="popup-overlay" onClick={() => setShowPopup(false)}>
            <div className="popup-box" onClick={e => e.stopPropagation()}>
              <div className="close-btn" onClick={() => setShowPopup(false)}>✕</div>
              <h3>Charging Session Info</h3>
              <p><span>ChargerId:</span> {chargerId}</p>
              <p><span>SessionId:</span> {sessionId}</p>
              <p><span>TransactionId:</span> {transactionId}</p>
              <p><span>Start Date:</span> {startDate}</p>
              <p><span>Start Time:</span> {startTime}</p>
              <p><span>Amount Paid:</span> ₹{amountPaid}</p>
              <p><span>Energy Selected:</span> {energySelected} kWh</p>
            </div>
          </div>
        )}

        {/* Stop Charging Button */}
        <div style={{ textAlign: 'center' }}>
          <button className="stop-charging" onClick={handleStop}>STOP CHARGING</button>
        </div>
      </div>
    </>
  );
}

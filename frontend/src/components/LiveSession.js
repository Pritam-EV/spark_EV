import React, { useState, useEffect, useRef } from 'react';
import ReactSpeedometer from 'react-d3-speedometer';
// import Button from '@mui/material/Button'; // Uncomment if using MUI
// import mqtt from 'mqtt'; // Uncomment if MQTT is used

const LiveSessionPage = ({ sessionId, energySelectedFromProps }) => {
  // State for consumed and selected energy (kWh)
  const [energyConsumed, setEnergyConsumed] = useState(0);
  const [energySelected, setEnergySelected] = useState(energySelectedFromProps || 50);

  // Compute usage percentage (capped at 100)
  const usagePercent = Math.min((energyConsumed / energySelected) * 100, 100);

  // MQTT client reference (preserve connection, session logic)
  const clientRef = useRef(null);

  useEffect(() => {
    // Example MQTT setup (adjust broker URL and topic as needed)
    /*
    clientRef.current = mqtt.connect('ws://your-broker-url');
    clientRef.current.subscribe(`sessions/${sessionId}/energy`);
    clientRef.current.on('message', (topic, message) => {
      const payload = JSON.parse(message.toString());
      if (payload.energyConsumed != null) {
        setEnergyConsumed(payload.energyConsumed);
      }
    });
    return () => {
      if (clientRef.current) {
        clientRef.current.end();
      }
    };
    */
  }, [sessionId]);

  const handleStop = () => {
    // Preserve original stop session logic (MQTT disconnect, API call, etc.)
    if (clientRef.current) {
      clientRef.current.end();
    }
    // e.g., call API to end session or navigate away
    console.log('Session stopped');
  };

  // Inline style for car fill container
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
    overflow: 'hidden',
    transition: 'height 0.5s ease',
    zIndex: 1,
  };
  // Glow overlay style
  const glowStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    boxShadow: '0 0 20px #04BFBF',
    pointerEvents: 'none',
    zIndex: 3,
  };

  return (
    <div style={{ color: '#fff', backgroundColor: '#172D32', padding: '20px' }}>
      {/* Style definitions for wave animation */}
      <style>{`
        @keyframes wave {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .wave {
          position: absolute;
          bottom: -5px;
          width: 200%;
          height: 100%;
          background: rgba(4, 191, 191, 0.6);
          border-radius: 37%;
          animation: wave 6s linear infinite;
        }
        .wave2 {
          animation-duration: 4s !important;
          opacity: 0.4;
          border-radius: 45%;
        }
      `}</style>

      {/* Animated Car Fill Container */}
      <div style={carContainerStyle}>
        {/* Waves */}
        {usagePercent < 100 && <div className="wave" />}
        {usagePercent < 100 && <div className="wave wave2" />}
        {/* Car image (use your /car2.png image) */}
        <img src="/car2.png" alt="Car" style={carImageStyle} />
        {/* Glow overlay */}
        <div style={glowStyle}></div>
        {/* Fill (background behind car) */}
        <div style={fillStyle}></div>
      </div>

      {/* Used Energy Text */}
      <div style={{ textAlign: 'center', marginTop: '10px', marginBottom: '20px' }}>
        Used: {energyConsumed.toFixed(2)} kWh / {energySelected} kWh
      </div>

      {/* Speedometer Gauges */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px' }}>
        {/* Voltage Gauge */}
        <div style={{ backgroundColor: '#2c4c57', padding: '10px', borderRadius: '8px' }}>
          <ReactSpeedometer
            // Show voltage up to 260V
            minValue={0}
            maxValue={260}
            // Example static value (you can bind to state if needed)
            value={230}
            segments={6}
            needleColor="#04BFBF"
            // Make gauge blend with dark theme
            startColor="#2c4c57"
            endColor="#2c4c57"
            segmentColors={Array(6).fill('#2c4c57')}
            textColor="#fff"
            width={200}
            height={160}
            valueTextFontSize="14px"
            currentValueText=""
          />
          <div style={{ textAlign: 'center', color: '#fff', marginTop: '5px' }}>Voltage (V)</div>
        </div>

        {/* Current Gauge */}
        <div style={{ backgroundColor: '#2c4c57', padding: '10px', borderRadius: '8px' }}>
          <ReactSpeedometer
            // Show current up to 35A
            minValue={0}
            maxValue={35}
            // Example static value
            value={20}
            segments={7}
            needleColor="#04BFBF"
            startColor="#2c4c57"
            endColor="#2c4c57"
            segmentColors={Array(7).fill('#2c4c57')}
            textColor="#fff"
            width={200}
            height={160}
            valueTextFontSize="14px"
            currentValueText=""
          />
          <div style={{ textAlign: 'center', color: '#fff', marginTop: '5px' }}>Current (A)</div>
        </div>
      </div>

      {/* Stop Session Button */}
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        {/* Using MUI Button: */}
        {/* <Button variant="contained" color="secondary" onClick={handleStop}>Stop</Button> */}
        <button onClick={handleStop} style={{
          backgroundColor: '#04BFBF',
          color: '#fff',
          border: 'none',
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          borderRadius: '4px'
        }}>
          Stop
        </button>
      </div>
    </div>
  );
};

export default LiveSessionPage;

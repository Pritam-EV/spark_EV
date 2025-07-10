import React from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import FooterNav from "../components/FooterNav";
import "../styles4.css";
import useMQTTClient from "../hooks/useMQTTClient";

// Constants
const FIXED_RATE = 20; // ₹ per kWh

// ----------- useSessionManager Hook --------------
function useSessionManager({ txnId, deviceId, amountPaid, energySelected, connected, publish }) {

  const navigate = useNavigate();
  const [session, setSession] = React.useState(() =>
    JSON.parse(localStorage.getItem("activeSession")) || {}
  );
  const [sessionStarted, setSessionStarted] = React.useState(!!session.sessionId);

  // Load active session or start new session if none
  React.useEffect(() => {
    const loadOrStartSession = async () => {
      
      if (sessionStarted) return;

      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No auth token");

        // Check active session from backend
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/sessions/active?deviceId=${deviceId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data?.sessionId) {
          setSession(res.data);
          localStorage.setItem("activeSession", JSON.stringify(res.data));
          setSessionStarted(true);
          return;
        }
      } catch (err) {
        // No active session or error - proceed to start new
      }

      if (txnId && deviceId) {
        await startSession(txnId, amountPaid, energySelected);
      }
    };

    loadOrStartSession();
  }, [txnId, deviceId, amountPaid, energySelected, sessionStarted]);

  // Start a new session
  const startSession = async (txnId, amountPaid, energySelected) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No auth token");

      const now = new Date();
      const sessionId = "session_" + now.getTime();
      const startTime = now.toISOString();
      const startDate = startTime.split("T")[0];
      const user = JSON.parse(localStorage.getItem("user")); // assume user is stored after login
      const startEnergyRaw = localStorage.getItem(`startEnergy_${deviceId}`);
      const startEnergy = startEnergyRaw !== null ? parseFloat(startEnergyRaw) : null;
      const userId = user?._id || user?.id;

console.log("🧪 Starting session with:", {
  sessionId,
  userId,
  deviceId,
  transactionId: txnId,
  startTime,
  startDate,
  amountPaid,
  energySelected,
});

const res = await axios.post(
  `${process.env.REACT_APP_API_URL}/api/sessions/start`,
  {
    sessionId,
    userId,
    deviceId,
    transactionId: txnId,
    startTime,
    startDate,
    amountPaid,
    energySelected,
  },
  { headers: { Authorization: `Bearer ${token}` } }
);

      const newSession = { ...res.data, startTime, startDate };
      setSession(newSession);
      setSessionStarted(true);
      localStorage.setItem("activeSession", JSON.stringify(newSession));
      localStorage.setItem(
        "sessionMeta",
        JSON.stringify({ transactionId: txnId, deviceId, amountPaid, energySelected })
      );

    } catch (err) {
      console.error("❌ Failed to start session:", err.message);
    }


  };
  
React.useEffect(() => {
  if (sessionStarted && connected && session?.sessionId && publish) {
    const { sessionId, userId, startTime, startDate } = session;

    publish(`${deviceId}/sessionCommand`, JSON.stringify({
      command: "start",
      sessionId,
      userId,
      startTime,
      startDate,
      energySelected,
      amountPaid,
      transactionId: txnId,
    }));

    console.log("🚀 Published sessionCommand to ESP32:", {
      command: "start",
      sessionId,
      userId,
      startTime,
      startDate,
      energySelected,
      amountPaid,
      transactionId: txnId,
    });
  }
}, [sessionStarted, session, connected, publish, deviceId, energySelected, amountPaid, txnId]);



  // Stop current session
  const stopSession = async (trigger = "manual") => {
    if (!session.sessionId) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No auth token");

      const endTime = new Date().toISOString();

      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/sessions/stop`,
        { sessionId: session.sessionId, endTime, endTrigger: trigger },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      localStorage.removeItem("activeSession");
      localStorage.removeItem("sessionMeta");
      setSession({});
      setSessionStarted(false);

      navigate("/session-summary", { state: { session: { ...session, endTime } } });
    } catch (err) {
      console.error("❌ Failed to stop session:", err.message);
    }
  };

  // Update session with energy consumed and amount used
  const updateSessionUsage = async (energyConsumed, amountUsed) => {
    if (!session.sessionId) return;

    setSession((prev) => ({ ...prev, energyConsumed, amountUsed }));

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No auth token");

      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/sessions/update`,
        { sessionId: session.sessionId, energyConsumed, amountUsed },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("❌ Failed to update session usage:", err.message);
    }
  };

  return {
    session,
    setSession,
    sessionStarted,
    setSessionStarted,
    startSession,
    stopSession,
    updateSessionUsage,
  };
}

// ----------- useEnergyMeter Hook --------------
function useEnergyMeter(
  deviceId,
  onUpdateSessionUsage,
  sessionStarted,
  amountPaid,
  energySelected,
  stopSession,
  mqttClient,
  publish,
  connected
) {
  const [charging, setCharging] = React.useState(false);
  const [relayConfirmed, setRelayConfirmed] = React.useState(false);
  const [voltage, setVoltage] = React.useState(0);
  const [current, setCurrent] = React.useState(0);
  const [startEnergy, setStartEnergy] = React.useState(null);
  const [currentEnergy, setCurrentEnergy] = React.useState(null);
  const [deltaEnergy, setDeltaEnergy] = React.useState(0);
  const [autoStopped, setAutoStopped] = React.useState(false);

  // --- Handle MQTT messages ---
  const handleMQTTMessage = (topic, msg) => {
    const value = parseFloat(msg);
    if (isNaN(value)) return;

    if (topic.endsWith("/voltage")) {
      setVoltage(value);
    } else if (topic.endsWith("/current")) {
      setCurrent(value);
    } else if (topic.endsWith("/energy")) {
      setCurrentEnergy(value);

      if (startEnergy === null && charging) {
        setStartEnergy(value);
        localStorage.setItem(`startEnergy_${deviceId}`, value);
      }

      if (startEnergy !== null) {
        const delta = parseFloat((value - startEnergy).toFixed(3));
        setDeltaEnergy(delta);
        const usedAmount = parseFloat((delta * FIXED_RATE).toFixed(2));

        console.log("📊 Live Reading:", {
          voltage,
          current,
          startEnergy,
          currentEnergy: value,
          deltaEnergy: delta,
          amountUsed: usedAmount,
        });

        onUpdateSessionUsage(delta, usedAmount);

        if (!autoStopped && amountPaid && usedAmount >= amountPaid) {
          stopSession("auto");
          setAutoStopped(true);
        }
      }
    } else if (topic.endsWith("/relay/state")) {
      const isOn = msg === "ON";
      setCharging(isOn);
      setRelayConfirmed(isOn);
    }
  };

  // --- Subscribe to MQTT topics ---
  React.useEffect(() => {
    if (!mqttClient || !connected || !deviceId) return;

    mqttClient.on("message", handleMQTTMessage);
    mqttClient.subscribe(`${deviceId}/voltage`);
    mqttClient.subscribe(`${deviceId}/current`);
    mqttClient.subscribe(`${deviceId}/energy`);
    mqttClient.subscribe(`${deviceId}/relay/state`);

    return () => {
      mqttClient.removeListener("message", handleMQTTMessage);
      mqttClient.unsubscribe(`${deviceId}/voltage`);
      mqttClient.unsubscribe(`${deviceId}/current`);
      mqttClient.unsubscribe(`${deviceId}/energy`);
      mqttClient.unsubscribe(`${deviceId}/relay/state`);
    };
  }, [mqttClient, connected, deviceId, startEnergy]);

  // --- Start Charging ---
  const startCharging = React.useCallback(() => {
    if (connected && mqttClient && deviceId) {
      publish(`${deviceId}/relay/set`, "ON");
      setCharging(true);
    }
  }, [connected, mqttClient, deviceId]);

  // --- Stop Charging ---
  const stopCharging = React.useCallback(() => {
    if (connected && mqttClient && deviceId) {
      publish(`${deviceId}/relay/set`, "OFF");
      setCharging(false);
      setRelayConfirmed(false);
    }
  }, [connected, mqttClient, deviceId]);

  return {
    charging,
    relayConfirmed,
    deltaEnergy,
    voltage,
    current,
    startCharging,
    stopCharging,
    connected,
  };
}


// ----------- useDragToStop Hook --------------
function useDragToStop(onStop) {
  const [dragging, setDragging] = React.useState(false);
  const [thumbLeft, setThumbLeft] = React.useState(0);

  React.useEffect(() => {
    const move = (e) => {
      if (!dragging) return;
      const track = document.getElementById("slider-track");
      if (!track) return;
      const posX = (e.touches?.[0] || e).clientX - track.getBoundingClientRect().left;
      const maxLeft = track.offsetWidth - 60;
      setThumbLeft(Math.max(0, Math.min(posX, maxLeft)));
    };

    const stop = () => {
      if (!dragging) return;
      const track = document.getElementById("slider-track");
      if (!track) return;
      const percent = (thumbLeft / (track.offsetWidth - 60)) * 100;
      setDragging(false);
      if (percent > 70) onStop();
      else setThumbLeft(0);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchmove", move);
    window.addEventListener("touchend", stop);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", stop);
    };
  }, [dragging, thumbLeft, onStop]);

  return { dragging, setDragging, thumbLeft };
}

// ------------- Main Component -----------------
const SessionStatus = () => {
  
  const { transactionId: paramTxnId } = useParams();
  const location = useLocation();

  // Meta params + fallback
  const localMeta = JSON.parse(localStorage.getItem("sessionMeta")) || {};
  const txnId = location.state?.transactionId || localMeta.transactionId || paramTxnId;
  const deviceId = location.state?.deviceId || localMeta.deviceId;
  const amountPaid = location.state?.amountPaid || localMeta.amountPaid;
  const energySelected = location.state?.energySelected || localMeta.energySelected;

const { mqttClient, connected, publish } = useMQTTClient(deviceId);


const {
  session,
  setSession,
  sessionStarted,
  setSessionStarted,
  stopSession,
  updateSessionUsage,
} = useSessionManager({ txnId, deviceId, amountPaid, energySelected, connected, publish });


const {
  charging,
  relayConfirmed,
  deltaEnergy,
  voltage,
  current,
  startCharging,
  stopCharging,
} = useEnergyMeter(

  deviceId,
  updateSessionUsage,
  sessionStarted,
  amountPaid,
  energySelected,
  stopSession,
  mqttClient,   // ✅ Add this
  publish,
  connected
);


  // Sync session with energy usage deltaEnergy & charging state
  React.useEffect(() => {
    setSession((prev) => ({
      ...prev,
      energyConsumed: deltaEnergy,
      amountUsed: (deltaEnergy * FIXED_RATE).toFixed(2),
    }));
  }, [deltaEnergy]);

  // Start charging once session is ready
  React.useEffect(() => {
    if (sessionStarted && connected && !charging) {
      startCharging();
    }
  }, [sessionStarted, connected]);





  // Warn user on page unload if charging active
  React.useEffect(() => {
    const handler = (e) => {
      if (charging) {
        e.preventDefault();
        e.returnValue = "Charging active! Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [charging]);

// Listen to live MQTT messages from ESP32
React.useEffect(() => {
  if (!mqttClient || !connected || !deviceId) return;

  const handleMessage = (topic, message) => {
    const value = parseFloat(message);
    if (isNaN(value)) return;

    setSession((prev) => {
      const updated = { ...prev };

      if (topic.endsWith("/voltage")) updated.voltage = value;
      else if (topic.endsWith("/current")) updated.current = value;
      else if (topic.endsWith("/energy")) {
        updated.currentEnergy = value;
        if (!prev.startEnergy) {
          updated.startEnergy = value;
          localStorage.setItem(`startEnergy_${deviceId}`, value);
        }
        updated.energyConsumed = parseFloat((value - updated.startEnergy).toFixed(3));
        updated.amountUsed = parseFloat((updated.energyConsumed * FIXED_RATE).toFixed(2));
      }

      return updated;
    });
  };

  mqttClient.on("message", handleMessage);
  mqttClient.subscribe(`${deviceId}/voltage`);
  mqttClient.subscribe(`${deviceId}/current`);
  mqttClient.subscribe(`${deviceId}/energy`);

  return () => {
    mqttClient.removeListener("message", handleMessage);
    mqttClient.unsubscribe(`${deviceId}/voltage`);
    mqttClient.unsubscribe(`${deviceId}/current`);
    mqttClient.unsubscribe(`${deviceId}/energy`);
  };
}, [mqttClient, connected, deviceId]);



  const { dragging, setDragging, thumbLeft } = useDragToStop(() => {
    stopCharging();
    stopSession("manual");
  });

  if (!session.sessionId) return <p>Loading session data...</p>;

  return (
    <div className="session-container">
      <div className="top-card">
        <p><strong>Device ID:</strong> {session.deviceId}</p>
        <p><strong>Session ID:</strong> {session.sessionId}</p>
        <p><strong>Start Time:</strong> {new Date(session.startTime).toLocaleString("en-IN")}</p>
        <p><strong>MQTT Status:</strong> {connected ? "Connected" : "Connecting..."}</p>
        <p className={`status ${relayConfirmed ? "charging" : "stopped"}`}>
          {relayConfirmed ? "Charging in Progress" : "Charging Stopped"}
        </p>
      </div>

      <div className="charging-progress-card">
        <div className="charging-info">
          <p className="large-text">{amountPaid} ₹</p>
          <p className="small-text">Amount Paid</p>

          <p className="large-text">{energySelected} kWh</p>
          <p className="small-text">Energy Selected</p>

          <p className="large-text">{(session.amountUsed ?? 0).toFixed(2)} ₹</p>
          <p className="small-text">Amount Used</p>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((session.amountUsed ?? 0) / amountPaid) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="live-data">
<div className="live-value">
  <p className="large-text">{voltage ?? 0} V</p>
  <p className="small-text">Voltage</p>
</div>
<div className="live-value">
  <p className="large-text">{current ?? 0} A</p>
  <p className="small-text">Current</p>
</div>

        <div className="live-value">
          <p className="large-text">{(session.energyConsumed ?? deltaEnergy).toFixed(3)} kWh</p>
          <p className="small-text">Energy Used</p>
        </div>
      </div>

      <div className="slide-container">
        <div className="slider-track" id="slider-track">
          <div
            className="slider-thumb"
            style={{ left: `${thumbLeft}px` }}
            onMouseDown={() => setDragging(true)}
            onTouchStart={() => setDragging(true)}
          />
          <span className="slider-label">Slide to Stop Charging</span>
        </div>
      </div>

      <FooterNav />
    </div>
  );
};

export default SessionStatus;

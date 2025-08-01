import React, { useEffect, useState, useRef  } from "react";
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
  const sentOnce = useRef(false);
  const [session, setSession] = useState(() =>
    JSON.parse(localStorage.getItem("activeSession")) || {}
  );
  const [sessionStarted, setSessionStarted] = useState(!!session.sessionId);

  useEffect(() => {
    const loadOrStartSession = async () => {
      if (sessionStarted) return;
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No auth token");
        const res = await axios.get(
          `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/active?deviceId=${deviceId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.sessionId) {
          console.log("📦 Existing session loaded from DB");
          setSession(res.data);
          localStorage.setItem("activeSession", JSON.stringify(res.data));
          setSessionStarted(true);
          return;
        }
      } catch (err) {
        console.warn("ℹ️ No active session found. Starting new...");
      }
      if (txnId && deviceId) {
        await startSession(txnId, amountPaid, energySelected);
      }
    };
    loadOrStartSession();
  }, [txnId, deviceId, amountPaid, energySelected, sessionStarted]);

  const startSession = async (txnId, amountPaid, energySelected) => {
    try {
      const token = localStorage.getItem("token");
      console.log("🔐 Token:", token);
      if (!token) throw new Error("No auth token");
      const now = new Date();
      const sessionId = "session_" + now.getTime();
      const startTime = now.toISOString();
      const startDate = startTime.split("T")[0];
      const user = JSON.parse(localStorage.getItem("user"));
      const startEnergyRaw = localStorage.getItem(`startEnergy_${deviceId}`);
      const startEnergy = startEnergyRaw !== null ? parseFloat(startEnergyRaw) : null;
      const userId = user?._id || user?.id;

      console.log("🧪 Starting session with:", {
        sessionId, userId, deviceId, transactionId: txnId, startTime,
        startDate, amountPaid, energySelected, startEnergy,
      });

      const res = await axios.post(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/start`,
        {
          sessionId, userId, deviceId, transactionId: txnId,
          startTime, startDate, amountPaid, energySelected, startEnergy,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("📬 POST response:", res);
      console.log("📦 res.data:", res.data);

      const newSession = { ...res.data, userId, startTime, startDate };
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

  useEffect(() => {
    if (
      !sessionStarted            ||   // session not ready yet
      !connected                 ||   // MQTT not connected
      sentOnce.current           ||   // already sent
      !session?.sessionId        ||   // no id yet
      !publish
    ) return;

    const { sessionId, userId, startTime, startDate } = session;

    const payload = {
      command:       "start",
      sessionId,
      deviceId,
      userId,
      startTime,
      startDate,
      energySelected,
      amountPaid,
      transactionId: txnId,
    };

    console.log("🚀 Sending *single* sessionCommand:", payload);

    // mqtt.js accepts an optional options object as 3rd param; QoS 1 is fine.
    publish(`device/${deviceId}/sessionCommand`,
            JSON.stringify(payload),            // message
            { qos: 1, retain: false });

    sentOnce.current = true;          // latch
  }, [sessionStarted, connected]);    // minimal deps

  const stopSession = async (trigger = "manual") => {
    if (!session.sessionId) return;
    try {
      const token = localStorage.getItem("token");
      const endTime = new Date().toISOString();
      await axios.post(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/stop`,
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
    sentOnce.current = false;   // allow the next session to publish
  };

  const updateSessionUsage = async (energyConsumed, amountUsed) => {
    if (!session.sessionId) return;
    setSession((prev) => ({ ...prev, energyConsumed, amountUsed }));
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/update`,
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
  const [charging, setCharging] = useState(false);
  const [relayConfirmed, setRelayConfirmed] = useState(false);
  const [voltage, setVoltage] = useState(0);
  const [current, setCurrent] = useState(0);
  const [startEnergy, setStartEnergy] = useState(null);
  const [deltaEnergy, setDeltaEnergy] = useState(0);
  const [autoStopped, setAutoStopped] = useState(false);

  const handleMQTTMessage = (topic, msg) => {
    const value = parseFloat(msg);
    if (isNaN(value)) return;
    if (topic.endsWith("/sensor/voltage")) {
      setVoltage(value);
    } else if (topic.endsWith("/sensor/current")) {
      setCurrent(value);
    } else if (topic.endsWith(`/device/${deviceId}/sensor/energy`)) {
      if (startEnergy === null && charging) {
        setStartEnergy(value);
        localStorage.setItem(`startEnergy_${deviceId}`, value);
      }
      if (startEnergy !== null) {
        const delta = parseFloat((value - startEnergy).toFixed(3));
        setDeltaEnergy(delta);
        const usedAmount = parseFloat((delta * FIXED_RATE).toFixed(2));
        console.log("📊 Energy Update:", {
          startEnergy,
          currentEnergy: value,
          delta,
          usedAmount,
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
      console.log(`🔌 Relay state: ${isOn ? "ON" : "OFF"}`);
    }
  };

  useEffect(() => {
    if (!mqttClient || !deviceId) return;
    mqttClient.on("message", handleMQTTMessage);
    return () => mqttClient.off("message", handleMQTTMessage);
  }, [mqttClient, deviceId, charging, startEnergy]);

  return {
    charging,
    relayConfirmed,
    deltaEnergy,
    voltage,
    current,
    handleMQTTMessage,
  };
}

// ----------- useDragToStop Hook --------------
function useDragToStop(onStop) {
  const [dragging, setDragging] = useState(false);
  const [thumbLeft, setThumbLeft] = useState(0);

  useEffect(() => {
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
  
  const localMeta = JSON.parse(localStorage.getItem("sessionMeta")) || {};
  const { transactionId: paramTxnId } = useParams();
  const location = useLocation();
const sentOnce = useRef(false);

  const txnId = location.state?.transactionId || localMeta.transactionId || paramTxnId;
  const deviceId = location.state?.deviceId || localMeta.deviceId;
  const amountPaid = location.state?.amountPaid || localMeta.amountPaid;
  const energySelected = location.state?.energySelected || localMeta.energySelected;

  const [processMessage, setProcessMessage] = useState(() => () => {});
  const { mqttClient, connected, publish } = useMQTTClient(deviceId, processMessage); 
  const {
    session,
    setSession,
    sessionStarted,
    setSessionStarted,
    stopSession,
    updateSessionUsage,
  } = useSessionManager({ txnId, deviceId, amountPaid, energySelected, connected, publish });

  const energy = useEnergyMeter(
    deviceId,
    updateSessionUsage,
    sessionStarted,
    amountPaid,
    energySelected,
    stopSession,
    mqttClient,
    publish,
    connected
  );

  useEffect(() => {
    setProcessMessage(() => energy.handleMQTTMessage);
  }, [energy.handleMQTTMessage]);

  const {
    charging,
    relayConfirmed,
    deltaEnergy,
    voltage,
    current,
    handleMQTTMessage,
  } = energy;

  useEffect(() => {
    const handler = (e) => {
      if (charging) {
        e.preventDefault();
        e.returnValue = "Charging active! Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [charging]);

useEffect(() => {
  if (
    !sentOnce.current &&            // ✅ correct
    sessionStarted &&
    connected &&
    publish &&
    session?.sessionId
  ) {
    const { sessionId, userId, startTime, startDate } = session;

    const payload = {
      command:        "start",
      sessionId,
      deviceId,
      userId,
      startTime,
      startDate,
      energySelected,
      amountPaid,
      transactionId:  txnId
    };

    console.log("🚀 1× sessionCommand → ESP32:", payload);
    publish(`device/${deviceId}/sessionCommand`, JSON.stringify(payload), { qos: 1 });

    sentOnce.current = true;        // ✅ correct
  }
}, [sessionStarted, connected, publish, session, deviceId, energySelected, amountPaid, txnId]);



  useEffect(() => {
    if (!sessionStarted || deltaEnergy == null) return;
    setSession((prev) => ({
      ...prev,
      energyConsumed: deltaEnergy,
      amountUsed: parseFloat((deltaEnergy * FIXED_RATE).toFixed(2)),
    }));
  }, [deltaEnergy, sessionStarted]);

  const handleStop = () => {
    if (connected && mqttClient && deviceId && session.sessionId) {
      console.log("🛑 Sending session STOP command...");
      publish(
        `device/${deviceId}/sessionCommand`,
        JSON.stringify({ command: "stop", sessionId: session.sessionId, deviceId })
      );
    }
    stopSession("manual");
  };

  const { dragging, setDragging, thumbLeft } = useDragToStop(handleStop);

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
          <p className="large-text">{(session.amountUsed ?? 0).toFixed(2)} ₹</p>
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

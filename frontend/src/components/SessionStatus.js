import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import useMQTTClient from "../hooks/useMQTTClient";
import axios from "axios";
import "../styles4.css";
import FooterNav from "../components/FooterNav";


function SessionStatus() {
const location = useLocation();
const { transactionId: txnFromParams } = useParams();
const localMeta = JSON.parse(localStorage.getItem("sessionMeta")) || {};
const locationMeta = location.state || {};
const transactionId = locationMeta.transactionId || localMeta.transactionId || txnFromParams;

const amountPaid = locationMeta.amountPaid || localMeta.amountPaid;
const energySelected = locationMeta.energySelected || localMeta.energySelected;
const deviceId = locationMeta.deviceId || localMeta.deviceId;

const navigate = useNavigate();
const [relayConfirmed, setRelayConfirmed] = useState(false);
const [startEnergy, setStartEnergy] = useState(null);      // Energy when session started
const [currentEnergy, setCurrentEnergy] = useState(null);  // Latest total energy from ESP32
const [deltaEnergy, setDeltaEnergy] = useState(0);         // Energy consumed in this session

  const [sessionData, setSessionData] = useState(() => {
    return JSON.parse(localStorage.getItem("activeSession")) || {
      deviceId: deviceId || "Unknown Device",
      sessionId: "",
      transactionId: "",
      startTime: "",
      startDate: "",
      voltage: 0,
      current: 0,
      energyConsumed: 0,
      amountUsed: 0,
    };
  });





  const [charging, setCharging] = useState(false);
  const [relayStartTime, setRelayStartTime] = useState(null);
  const FIXED_RATE_PER_KWH = 20; // ₹20 per kWh

  const [sessionStarted, setSessionStarted] = useState(false);
console.log("🧾 Final Resolved Meta:", {
  transactionId,
  amountPaid,
  energySelected,
  deviceId,
});
useEffect(() => {
  console.log("📊 Energy Debug:", {
    startEnergy,
    currentEnergy,
    deltaEnergy,
    charging,
  });
}, [startEnergy, currentEnergy, deltaEnergy, charging]);




  useEffect(() => {
    const checkActiveSession = async () => {
     
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

const resolvedDeviceId = deviceId || localMeta.deviceId || sessionData.deviceId || "DEFAULT_DEVICE_ID";
const response = await axios.get(
  `${process.env.REACT_APP_API_URL}/api/sessions/active?deviceId=${resolvedDeviceId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);



        if (response.data && response.data.sessionId) {
          console.log("✅ Active session found:", response.data);
          setSessionData(response.data);
          localStorage.setItem("activeSession", JSON.stringify(response.data));
          setSessionStarted(true); // <-- Add this to prevent false negatives
          return;
        }
      } catch (error) {
        console.warn("⚠️ No active session found. Proceeding to start a new session.");
      }

const metaFromStorage = JSON.parse(localStorage.getItem("sessionMeta") || "{}");
console.log("🧠 Loaded sessionMeta:", metaFromStorage);

const effectiveTransactionId = transactionId || metaFromStorage.transactionId;
const effectiveAmountPaid = amountPaid || metaFromStorage.amountPaid;
const effectiveEnergySelected = energySelected || metaFromStorage.energySelected;

console.log("📦 Effective session params:", {
  transactionId: effectiveTransactionId,
  amountPaid: effectiveAmountPaid,
  energySelected: effectiveEnergySelected
});

const effectiveDeviceId = deviceId || localMeta.deviceId;
const localSessionStarted = localStorage.getItem("sessionStarted") === "true";

if (effectiveTransactionId && effectiveDeviceId && !sessionStarted && !localSessionStarted) {
  await startSession(effectiveTransactionId, effectiveAmountPaid, effectiveEnergySelected);
} else {
  console.log("⚠️ Skipping startSession(): Either session already started or missing transactionId/deviceId.");
}


};

    checkActiveSession();
  }, [transactionId, deviceId]);

  const waitForMQTTConnection = (timeout = 50000) => {
    return new Promise((resolve, reject) => {
      let settled = false;
  
      const cleanup = () => {
        clearTimeout(timer);
        mqttClient?.off("connect", handleConnect);
        mqttClient?.off("error", handleError);
      };
  
      const handleConnect = () => {
        if (!settled) {
          settled = true;
          console.log("✅ MQTT connected via event");
          cleanup();
          resolve(true);
        }
      };
  
      const handleError = (err) => {
        if (!settled) {
          settled = true;
          console.error("❌ MQTT error", err);
          cleanup();
          reject(new Error("MQTT error"));
        }
      };
  
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          console.error("❌ MQTT connection timeout");
          cleanup();
          reject(new Error("MQTT connection timeout"));
        }
      }, timeout);
  
      // Early exit if already connected
      if (mqttClient && mqttClient.connected) {
        settled = true;
        console.log("✅ MQTT already connected");
        cleanup();
        return resolve(true);
      }
  
      mqttClient?.on("connect", handleConnect);
      mqttClient?.on("error", handleError);
    });
  };
  
const handleMQTTMessage = (topic, value) => {
  const energy = parseFloat(value);

  if (topic === `${deviceId}/relayState`) {
    const isOn = value === "ON";
    setCharging(isOn);

    if (isOn && startEnergy === null && currentEnergy !== null) {
      // Just started charging → set startEnergy to currentEnergy
      console.log("⚡ Initializing startEnergy:", currentEnergy);
      setStartEnergy(currentEnergy);
    }
  }

  if (topic === `${deviceId}/energy` && !isNaN(energy)) {
    setCurrentEnergy(energy);

    // Delay startEnergy setting until relay is confirmed ON
    if (charging && startEnergy === null) {
      console.log("⚡ Setting startEnergy from energy topic:", energy);
      setStartEnergy(energy);
    }

    if (charging && startEnergy !== null) {
      const delta = parseFloat((energy - startEnergy).toFixed(3));
      setDeltaEnergy(delta);
    }
  }

  if (topic === `${deviceId}/voltage`) {
    setSessionData((prev) => ({ ...prev, voltage: value }));
  }

  if (topic === `${deviceId}/current`) {
    setSessionData((prev) => ({ ...prev, current: value }));
  }
};



const { mqttClient, connected, publish } = useMQTTClient(
  deviceId || sessionData?.deviceId,
  handleMQTTMessage
);



const startSession = async (txnId, paid, energy) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return;

const activeDeviceId = deviceId || localMeta.deviceId;
if (!activeDeviceId || !txnId) {
  console.error("⚠️ Missing deviceId or transactionId!");
  return;
}


    const sessionId = "session_" + new Date().getTime();
    const now = new Date();
    const formattedDate = now.toISOString().split("T")[0];
    const formattedTime = now.toISOString();

    const response = await axios.post(
      `${process.env.REACT_APP_API_URL}/api/sessions/start`,
      {
        sessionId,
        deviceId,
        transactionId: txnId,
        startTime: formattedTime,
        startDate: formattedDate,
        amountPaid: paid,
        energySelected: energy,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = response.data;

    setSessionData((prev) => ({
      ...prev,
      sessionId: data.sessionId || sessionId,
      startTime: formattedTime,
      startDate: formattedDate,
      amountPaid: paid,
      energySelected: energy,
    }));

    setSessionStarted(true);
    localStorage.setItem("sessionStarted", "true");
localStorage.setItem("sessionMeta", JSON.stringify({
  transactionId: txnId,
  amountPaid: paid,
  energySelected: energy,
  deviceId: deviceId || sessionData.deviceId,
}));


    await waitForMQTTConnection();
    startCharging();
  } catch (err) {
    console.error("❌ Failed to start session:", err.message);
  }
};
useEffect(() => {
  if (transactionId && amountPaid && energySelected && deviceId) {
    localStorage.setItem(
      "sessionMeta",
      JSON.stringify({ transactionId, amountPaid, energySelected, deviceId })
    );
  }
}, [transactionId, amountPaid, energySelected, deviceId]);



  useEffect(() => {
    localStorage.setItem("activeSession", JSON.stringify(sessionData));
  }, [sessionData]);

  // ✅ FIXED MQTT CONNECTION PART ONLY BELOW
  

useEffect(() => {
  if (sessionStarted && mqttClient) {
    console.log("⚡ Resuming charging after reconnect or reload...");
    startCharging();
  }
}, [mqttClient, sessionStarted]);


  
  
  useEffect(() => {
    window.onbeforeunload = () => {
      if (charging) {
        return "Are you sure you want to leave? The session is active.";
      }
    };
    return () => {
      window.onbeforeunload = null;
    };
  }, [charging]);


  const [lastUpdateTime, setLastUpdateTime] = useState(null);
 
useEffect(() => {
  if (!charging || startEnergy === null || currentEnergy === null || isNaN(deltaEnergy)) return;

  const interval = setInterval(() => {
    const energy = deltaEnergy;
    const totalAmount = parseFloat((energy * FIXED_RATE_PER_KWH).toFixed(2));

    console.log("🧾 Calculated deltaEnergy:", deltaEnergy);
    console.log("💸 Calculated amountUsed:", totalAmount);

    setSessionData((prev) => ({
      ...prev,
      energyConsumed: energy,
      amountUsed: totalAmount,
    }));

    axios.post(`${process.env.REACT_APP_API_URL}/api/sessions/update`, {
      sessionId: sessionData.sessionId,
      energyConsumed: energy,
      amountUsed: totalAmount,
    }).catch((err) => console.error("❌ Session update failed:", err));

    if (amountPaid && totalAmount >= amountPaid && !autoStopped) {
      console.log("⚠️ Auto-stopping due to ₹ limit...");
      stopCharging("auto");
      setAutoStopped(true);
    }
  }, 5000); // every 5 sec

  return () => clearInterval(interval);
}, [charging, startEnergy, currentEnergy, deltaEnergy]);


  
  let retryCount = 0;
  const MAX_RETRIES = 5;
  
const startCharging = () => {
  console.log("🚀 Attempting to Start Charging...");

  if (!mqttClient || !mqttClient.connected) {
    if (retryCount >= MAX_RETRIES) {
      console.error("❌ Exceeded MQTT connection retries.");
      return;
    }
    retryCount++;
    setTimeout(startCharging, 1000);
    return;
  }

  retryCount = 0; // Reset retry on success

if (!sessionData.sessionId) {
  console.warn("⚠️ No session ID. Skipping relay publish.");
  return;
}


  const activeDeviceId = deviceId || sessionData?.deviceId;
  const relayTopic = `${activeDeviceId}/relayState`;

  console.log(`📡 Publishing "ON" to ${relayTopic}`);
  publish(relayTopic, "ON");

  setCharging(true); // <-- ✅ Make sure we mark this
  setRelayStartTime(Date.now());
  // ✅ Set start energy immediately if we have a currentEnergy value
  if (startEnergy === null && currentEnergy !== null) {
    console.log("✅ [StartCharging] Setting startEnergy:", currentEnergy);
    setStartEnergy(currentEnergy);
  }
};


  const stopCharging = async (triggerType = "manual") => {
    console.warn("⚠️ stopCharging() Triggered:", triggerType);
    if (!sessionData.sessionId) {
      console.error("No valid session ID found!");
      return;
    }

    console.log("Stopping session with ID:", sessionData.sessionId);

if (mqttClient) {
  const activeDeviceId = deviceId || sessionData?.deviceId;
  const relayTopic = `${activeDeviceId}/relayState`;

  console.log(`📡 Publishing "OFF" to ${relayTopic}`);
  publish(relayTopic, "OFF");
}


    setCharging(false);
setRelayConfirmed(false);

    const now = new Date();
    const istDate = new Date(now.getTime());
    const formattedTime = istDate.toISOString();

    const sessionPayload = {
      sessionId: sessionData.sessionId,
      endTime: formattedTime,
      endTrigger: triggerType,
    };

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("❌ No authentication token found!");
        return;
      }

      console.log("📤 Sending stop session request:", sessionPayload);

      const response = await axios.post(
        "https://spark-ev-backend.onrender.com/api/sessions/stop",
        sessionPayload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("✅ Session stopped successfully:", response.data);

      localStorage.removeItem("activeSession");
      localStorage.removeItem("sessionStarted");
      localStorage.removeItem("sessionMeta");

      setSessionData(null);
      navigate("/session-summary", {
        state: { session: { ...sessionData, endTime: formattedTime } },
      });
    } catch (error) {
      console.error("❌ Failed to stop session:", error.response?.data || error.message);
    }
  };

const [autoStopped, setAutoStopped] = useState(false);

useEffect(() => {
  if (
    charging &&
    energySelected &&
    deltaEnergy >= energySelected &&
    !autoStopped
  ) {
    console.log("⚠️ Auto-stopping due to energy limit...");
    stopCharging();
    setAutoStopped(true);
  }
}, [deltaEnergy, energySelected, charging, autoStopped]);


const [isDragging, setIsDragging] = useState(false);
const [thumbLeft, setThumbLeft] = useState(0);

  useEffect(() => {
    const handleUnload = () => {
      
      if (!charging) {
        localStorage.removeItem("activeSession");
        localStorage.removeItem("sessionStarted");
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [charging]);

useEffect(() => {
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const track = document.getElementById("slider-track");
    const rect = track.getBoundingClientRect();
    const posX = e.clientX - rect.left;
    const clamped = Math.max(0, Math.min(posX, rect.width - 60));
    setThumbLeft(clamped);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !e.touches[0]) return;
    const track = document.getElementById("slider-track");
    const rect = track.getBoundingClientRect();
    const posX = e.touches[0].clientX - rect.left;
    const clamped = Math.max(0, Math.min(posX, rect.width - 60));
    setThumbLeft(clamped);
  };

  const handleRelease = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const track = document.getElementById("slider-track");
    if (!track) return;
    const percent = (thumbLeft / (track.offsetWidth - 60)) * 100;
    if (percent > 70) {
      stopCharging("manual");
    } else {
      setThumbLeft(0);
    }
  };

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleRelease);
  window.addEventListener("touchmove", handleTouchMove);
  window.addEventListener("touchend", handleRelease);

  return () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleRelease);
    window.removeEventListener("touchmove", handleTouchMove);
    window.removeEventListener("touchend", handleRelease);
  };
}, [isDragging, thumbLeft]);





  return (
    <div className="session-container">
      {sessionData ? (
        <>
          {console.log("🔍 UI Debug: Rendering session data:", sessionData)}

          <div className="top-card">
            <p>
              <strong>Device ID:</strong> {sessionData?.deviceId || "Unknown"}
            </p>
            <p>
              <strong>Session ID:</strong> {sessionData?.sessionId || "N/A"}
            </p>
            <p>
              <strong>Start Time:</strong>{" "}
               {new Date(sessionData?.startTime).toLocaleString("en-IN", {
                 timeZone: "Asia/Kolkata",
               }) || "N/A"}
            </p>

            <p>
              <strong>MQTT Status:</strong> {mqttClient?.connected ? "Connected" : "Connecting..."}
            </p>
<p className={`status ${relayConfirmed ? "charging" : "stopped"}`}>
  {relayConfirmed ? "Charging in Progress" : "Charging Stopped"}
</p>

          </div>

          <div className="charging-progress-card">
            <div className="charging-info">
              <p className="large-text">{amountPaid ?? 0} ₹</p>
              <p className="small-text">Total Amount Paid</p>

              <p className="large-text">{energySelected ?? 0} kWh</p>
              <p className="small-text">Energy Selected</p>

              <p className="large-text">{(sessionData.amountUsed ?? 0).toFixed(2)} ₹</p>
              <p className="small-text">Amount Used</p>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${(sessionData.amountUsed / (amountPaid || 1)) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
          <div className="live-data">
            <div className="live-value">
              <p className="large-text">{sessionData.voltage ?? 0} V</p>
              <p className="small-text">Voltage</p>
            </div>
            <div className="live-value">
              <p className="large-text">{sessionData.current ?? 0} A</p>
              <p className="small-text">Current</p>
            </div>
            <div className="live-value">
<p className="large-text">
{sessionData.energyConsumed > 0
  ? sessionData.energyConsumed.toFixed(3)
  : deltaEnergy.toFixed(3)} kWh

</p>


              <p className="small-text">Energy Consumed</p>
            </div>
          </div>

<div className="slide-container">
  <div className="slider-track" id="slider-track">
<div
  className="slider-thumb"
  style={{ left: `${thumbLeft}px` }}
  onMouseDown={() => setIsDragging(true)}
  onTouchStart={() => setIsDragging(true)}
>
  
</div>

    <span className="slider-label">Slide to Stop Charging</span>
  </div>
</div>






        </>
      ) : (
        <p>Loading session data...</p>
      )}

      <FooterNav />

    </div>

    
  );
}

export default SessionStatus;

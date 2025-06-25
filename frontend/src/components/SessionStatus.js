import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import mqtt from "mqtt";
import axios from "axios";
import "../styles4.css";
import FooterNav from "../components/FooterNav";


const MQTT_BROKER_URL = "223f72957a1c4fa48a3ae815c57aab34.s1.eu.hivemq.cloud";
const MQTT_PORT = "8884";
const MQTT_USER = "pritam";
const MQTT_PASSWORD = "Pritam123";

function SessionStatus() {
  const { transactionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { deviceId, amountPaid, energySelected } = location.state || {};

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
  const [mqttClient, setMqttClient] = useState(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  useEffect(() => {

  if (!deviceId && !sessionData?.deviceId) {
    console.warn("⚠️ Device ID not available yet. Skipping MQTT init.");
    return;
  }

  const activeDeviceId = deviceId || sessionData.deviceId;
  const voltageTopic = `${activeDeviceId}/voltage`;
  const currentTopic = `${activeDeviceId}/current`;
  const relayTopic = `${activeDeviceId}/relay`;

  console.log("📡 Subscribing to:", voltageTopic, currentTopic, relayTopic);

    const client = mqtt.connect(`wss://${MQTT_BROKER_URL}:${MQTT_PORT}/mqtt`, {
      username: MQTT_USER,
      password: MQTT_PASSWORD,
      rejectUnauthorized: false,
    });

client.on("connect", () => {
  console.log("✅ MQTT Connected");
  setMqttClient(client);
  client.subscribe([voltageTopic, currentTopic, relayTopic]);

  if (localStorage.getItem("sessionStarted") === "true") {
    console.log("⚡ MQTT Connected: Session still active, starting relay.");
    client.publish(relayTopic, "ON");
    setRelayStartTime(Date.now());
    setCharging(true);
  } else {
    console.log("🛑 MQTT Connected: No active session, skipping relay ON.");
  }
});


    client.on("message", (topic, message) => {
      const data = parseFloat(message.toString());
      setSessionData((prev) => ({
        ...prev,
      voltage: topic === voltageTopic ? data : prev.voltage,
      current: topic === currentTopic ? data : prev.current,

      }));
    });

    client.on("error", (err) => console.error("❌ MQTT Error:", err));
    client.on("reconnect", () => console.warn("♻️ MQTT Reconnecting..."));
    client.on("close", () => console.warn("🔌 MQTT Connection Closed"));
    client.on("offline", () => console.warn("📴 MQTT Offline"));

return () => {
  console.log("🟡 Skipping MQTT disconnect on unmount to preserve session.");
  // client.end(); <-- Comment this out to keep MQTT alive even if component unmounts
};
  }, [deviceId, sessionData?.deviceId]);


  useEffect(() => {
    const checkActiveSession = async () => {
     
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/sessions/active`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data) {
          console.log("✅ Active session found:", response.data);
          setSessionData(response.data);
          localStorage.setItem("activeSession", JSON.stringify(response.data));
          setCharging(true);
          setSessionStarted(true); // <-- Add this to prevent false negatives
          return;
        }
      } catch (error) {
        console.warn("⚠️ No active session found. Proceeding to start a new session.");
      }

      const localSessionStarted = localStorage.getItem("sessionStarted") === "true";

      if (transactionId && !sessionStarted && !localSessionStarted) {
        startSession();
      } else {
        console.log("⚠️ Skipping startSession(): Session already started.");
        await startSession(); // Ensure relay ON if session is already started
      }
      
    };

    checkActiveSession();
  }, [transactionId, deviceId]);

  const waitForMQTTConnection = (timeout = 5000) => {
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
  
  
  const startSession = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        console.error("⚠️ No authentication token found!");
        return;
      }

      console.log("🔹 Checking session data before request:", {
        deviceId,
        transactionId,
        amountPaid,
        energySelected,
      });

      if (!deviceId || !transactionId) {
        console.error("⚠️ Missing deviceId or transactionId!");
        return;
      }

      const sessionId = "session_" + new Date().getTime();

      const now = new Date();
      const formattedDate = now.toISOString().split("T")[0];
      const formattedTime = now.toISOString(); // already in UTC
      

      console.log("📤 Sending session start request:", {
        sessionId,
        transactionId,
        formattedTime,
        amountPaid,
        energySelected,
      });

      const response = await axios.post(
        "http://localhost:5000/api/sessions/start",
        {
          sessionId,
          deviceId,
          transactionId,
          startTime: formattedTime,
          startDate: formattedDate,
          amountPaid,
          energySelected,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("🟢 Server Response:", response.data);

      const data = response.data;

      if (!data.sessionId) {
        console.error("⚠️ Server did not return a valid sessionId!");
        return;
      }

      console.log("✅ Session started successfully:", data);

      setSessionData((prev) => ({
        ...prev,
        sessionId: data.sessionId || sessionId,
        startTime: formattedTime,
        startDate: formattedDate,
        amountPaid,
        energySelected,
      }));

      setSessionStarted(true);
      localStorage.setItem("sessionStarted", "true");

    } catch (error) {
      console.error("❌ Failed to start session:", error.message);
    }

      try {
        await waitForMQTTConnection(); // ✅ Wait for MQTT
        startCharging(); // ✅ Only start charging after MQTT is ready

        console.log("🔌 Proceeding to start charging...");
        // continue with relay publish / charging logic
      } catch (error) {
        console.error("❌ Failed to start charging:", error);
       
      }
  };

  useEffect(() => {
    localStorage.setItem("activeSession", JSON.stringify(sessionData));
  }, [sessionData]);

  // ✅ FIXED MQTT CONNECTION PART ONLY BELOW
  

useEffect(() => {
  if (charging && mqttClient) {
    console.log("⚡ Resuming charging on reconnect...");
    startCharging();
  }
}, [mqttClient, charging]);

  
  
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
  if (!charging) return;

  const now = Date.now();
  if (!lastUpdateTime) {
    setLastUpdateTime(now); // ✅ Ensure we start tracking
  }

  const interval = setInterval(() => {
    const current = Date.now();
    const durationSeconds = (current - lastUpdateTime) / 1000;
    setLastUpdateTime(current); // ✅ Update after each cycle

    setSessionData((prev) => {
      const voltage = parseFloat(prev.voltage);
      const currentVal = parseFloat(prev.current);
      const previousEnergy = parseFloat(prev.energyConsumed) || 0;

      if (isNaN(voltage) || isNaN(currentVal)) return prev;

      const powerKW = (voltage * currentVal) / 1000;
      const durationHours = durationSeconds / 3600;
      const newEnergy = powerKW * durationHours;

      const totalEnergy = previousEnergy + newEnergy;
      const totalAmount = totalEnergy * FIXED_RATE_PER_KWH;

      console.log("🔋 Energy Update:", {
        voltage,
        current: currentVal,
        durationSeconds,
        powerKW,
        newEnergy,
        totalEnergy,
        totalAmount,
      });

      axios.post("http://localhost:5000/api/sessions/update", {
        sessionId: prev.sessionId,
        energyConsumed: totalEnergy,
        amountUsed: totalAmount,
      }).catch((err) => console.error("❌ Session update failed:", err));

      if (totalAmount >= (amountPaid || 0)) {
        stopCharging("auto");
        clearInterval(interval);
      }

      return {
        ...prev,
        energyConsumed: totalEnergy,
        amountUsed: totalAmount,
      };
    });
  }, 5000); // every 5 seconds

  return () => {
    clearInterval(interval);
    setLastUpdateTime(null);
  };
}, [charging]);


  
  let retryCount = 0;
  const MAX_RETRIES = 5;
  
  const startCharging = () => {
    console.log("🚀 Attempting to Start Charging...");

  if (!mqttClient || !mqttClient.connected) {
    if (retryCount >= MAX_RETRIES) {
      console.error("Exceeded MQTT connection retries.");
      return;
    }
    retryCount++;
    setTimeout(startCharging, 1000);
    return;
  }
  retryCount = 0; // Reset on success
    if (charging) {
      console.log("⏭️ Charging already in progress. Skipping relay ON.");
      return;
    }
    const activeDeviceId = deviceId || sessionData?.deviceId;
    const relayTopic = `${activeDeviceId}/relay`;
    mqttClient.publish(relayTopic, "ON", () => {
      console.log("✅ Charging Started via MQTT (inside startCharging)");
      setRelayStartTime(Date.now());
      setLastUpdateTime(Date.now());  // <<< ADD THIS LINE
      setCharging(true);
  });
  

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
      const relayTopic = `${activeDeviceId}/relay`;

      mqttClient.publish(relayTopic, "OFF", () => {
        console.log("Charging Stopped via MQTT");
      });
    }

    setCharging(false);

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
        "http://localhost:5000/api/sessions/stop",
        sessionPayload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("✅ Session stopped successfully:", response.data);

      localStorage.removeItem("activeSession");
      localStorage.removeItem("sessionStarted");

      setSessionData(null);
      navigate("/session-summary", {
        state: { session: { ...sessionData, endTime: formattedTime } },
      });
    } catch (error) {
      console.error("❌ Failed to stop session:", error.response?.data || error.message);
    }
  };

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
            <p className={`status ${charging ? "charging" : "stopped"}`}>
              {charging ? "Charging in Progress" : "Charging Stopped"}
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
    : "Calculating..."} kWh
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

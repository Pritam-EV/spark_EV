// src/pages/SessionSummary.js
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles4.css";

const SessionSummary = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const sessionId = state?.sessionId;

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!sessionId) return;

    const fetchSession = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/${sessionId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Failed to fetch session");
        const data = await res.json();
        setSession(data);
      } catch (err) {
        console.error("❌ Error fetching session:", err);
        setError("Could not load session summary.");
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  if (!sessionId) return <p>Invalid session.</p>;
  if (loading) return <p>Loading session summary...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="summary-container">
      <h2>🔋 Session Summary</h2>

      <div className="summary-card">
        <p><strong>Transaction ID:</strong> {session.transactionId}</p>
        <p><strong>Device ID:</strong> {session.deviceId}</p>
        <p><strong>Session ID:</strong> {session.sessionId}</p>
        <p><strong>Start Time:</strong> {new Date(session.startTime).toLocaleString()}</p>
        <p><strong>End Time:</strong> {new Date(session.endTime).toLocaleString()}</p>
        <p><strong>Energy Consumed:</strong> {session.energyConsumed?.toFixed(3)} kWh</p>
        <p><strong>Amount Used:</strong> ₹{session.amountUsed?.toFixed(2)}</p>
      </div>

      <div className="summary-buttons">
        <button onClick={() => navigate("/home")}>🏠 Go to Home</button>
        <button onClick={() => navigate("/profile")}>👤 My Profile</button>
      </div>
    </div>
  );
};

export default SessionSummary;

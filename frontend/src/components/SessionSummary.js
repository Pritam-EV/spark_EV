// src/pages/SessionSummary.js
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles4.css";

const SessionSummary = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const session = state?.session;

  if (!session) return <p>Session summary not available.</p>;

  return (
    <div className="summary-container">
      <h2>🔋 Session Summary</h2>

      <div className="summary-card">
        <p><strong>Transaction ID:</strong> {session.transactionId}</p>
        <p><strong>Device ID:</strong> {session.deviceId}</p>
        <p><strong>Session ID:</strong> {session.sessionId}</p>
        <p><strong>Start Time:</strong> {new Date(session.startTime).toLocaleString()}</p>
        <p><strong>End Time:</strong> {new Date(session.endTime).toLocaleString()}</p>
        <p><strong>Energy Consumed:</strong> {session.energyConsumed.toFixed(3)} kWh</p>
        <p><strong>Amount Used:</strong> ₹{session.amountUsed.toFixed(2)}</p>
      </div>

      <div className="summary-buttons">
        <button onClick={() => navigate("/home")}>🏠 Go to Home</button>
        <button onClick={() => navigate("/profile")}>👤 My Profile</button>
      </div>
    </div>
  );
};

export default SessionSummary;

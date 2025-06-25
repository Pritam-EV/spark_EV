import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrReader } from '@blackbox-vision/react-qr-reader';
import axios from "axios";

const QRScanner = () => {
  const navigate = useNavigate();
  const [device_id, setDeviceId] = useState("");
  const [error, setError] = useState("");

  const API_URL = "http://localhost:5000/api/devices/check-device";

  const handleScan = async (data) => {
    if (data?.text) {
      setDeviceId(data.text);
      await verifyDevice(data.text);
    }
  };

  const handleError = (err) => {
    console.error(err);
    setError("QR scanner failed. Please enter the device ID manually.");
  };

  const verifyDevice = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      if (response.data.exists) {
        navigate(`/charging-options/${id}`);
      } else {
        setError("Device not found. Please check the ID.");
      }
    } catch (err) {
      console.error(err);
      setError("Error verifying device. Try again.");
    }
  };

  const handleManualEntry = async () => {
    if (device_id.trim() !== "") {
      await verifyDevice(device_id);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Scan QR Code</h2>

      <div style={styles.scannerContainer}>
        <QrReader
          constraints={{ facingMode: "environment" }}
          scanDelay={300}
          onResult={handleScan}
          onError={handleError}
          style={styles.qrScanner}
        />
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <h3 style={styles.heading}>Or</h3>
      <input
        type="text"
        placeholder="Enter Device ID"
        value={device_id}
        onChange={(e) => setDeviceId(e.target.value)}
        style={styles.input}
      />
      <button onClick={handleManualEntry} style={styles.enterButton}>
        Enter
      </button>
      <button onClick={() => navigate("/home")} style={styles.backButton}>
        Back
      </button>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100vw",
    height: "100vh",
    backgroundColor: "#030504",
    color: "#fffffe",
    padding: "10px",
    boxSizing: "border-box",
  },
  heading: {
    fontSize: "22px",
    color: "#f4af2d",
    marginBottom: "20px",
  },
  scannerContainer: {
    width: "90vw",
    maxWidth: "320px",
    aspectRatio: "1",
    border: "2px solid #2f8ca3",
    marginBottom: "20px",
    borderRadius: "10px",
    overflow: "hidden",
    backgroundColor: "#193f4a",
  },
  qrScanner: {
    width: "100%",
    height: "100%",
  },
  error: {
    color: "red",
    fontSize: "14px",
    textAlign: "center",
    marginBottom: "10px",
  },
  input: {
    width: "90%",
    maxWidth: "300px",
    padding: "12px",
    fontSize: "16px",
    borderRadius: "6px",
    backgroundColor: "#193f4a",
    color: "#fffffe",
    border: "1px solid #2f8ca3",
    marginBottom: "10px",
    outline: "none",
  },
  enterButton: {
    width: "90%",
    maxWidth: "300px",
    padding: "12px",
    fontSize: "16px",
    borderRadius: "6px",
    backgroundColor: "#f4af2d",
    color: "#030504",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
    marginBottom: "10px",
  },
  backButton: {
    width: "90%",
    maxWidth: "300px",
    padding: "12px",
    fontSize: "16px",
    borderRadius: "6px",
    backgroundColor: "#193f4a",
    color: "#f4af2d",
    border: "1px solid #2f8ca3",
    fontWeight: "bold",
    cursor: "pointer",
  },
};

export default QRScanner;

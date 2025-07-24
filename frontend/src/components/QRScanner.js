import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrReader } from '@blackbox-vision/react-qr-reader';
import axios from "axios";

const QRScanner = () => {
  const navigate = useNavigate();
  const [device_id, setDeviceId] = useState("");
  const [error, setError] = useState("");

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
      const response = await axios.get(`${process.env.REACT_APP_Backend_API_Base_URL}/api/devices/check-device/${id}`);
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
      <div style={styles.scannerWrapper}>
        <div style={styles.outerFrame}>
          <div style={styles.cornerTopLeft}></div>
          <div style={styles.cornerTopRight}></div>
          <div style={styles.cornerBottomLeft}></div>
          <div style={styles.cornerBottomRight}></div>
        </div>

        <div style={styles.cameraBox}>
          <QrReader
            constraints={{ facingMode: "environment" }}
            scanDelay={300}
            onResult={handleScan}
            onError={handleError}
            style={styles.qrScanner}
          />
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <input
        type="text"
        placeholder="Enter Charger ID"
        value={device_id}
        onChange={(e) => setDeviceId(e.target.value)}
        style={styles.input}
      />
      <button onClick={handleManualEntry} style={styles.enterButton}>
        Connect with Charger
      </button>
      <button onClick={() => navigate("/home")} style={styles.backButton}>
        Back
      </button>
    </div>
  );
};

const styles = {
  container: {
    width: "100vw",
    height: "100vh",
    backgroundColor: "#ffffff", // white full-page background
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    padding: "20px",
    boxSizing: "border-box",
  },
  scannerWrapper: {
    position: "relative",
    width: "90vw",
    maxWidth: "320px",
    aspectRatio: "1",
    marginBottom: "20px",
  },
cameraBox: {
  position: "absolute",        // make it position relative to scannerWrapper
  top: "50%",                  // move to middle vertically
  left: "50%",                 // move to middle horizontally
  transform: "translate(-50%, -50%)", // offset back by half its own size
  width: "80%",
  height: "80%",
  borderRadius: "16px",
  overflow: "hidden",
  backgroundColor: "#000",
  zIndex: 1,
},
  outerFrame: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 2,
    pointerEvents: "none",
  },
  cornerTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "40px",
    height: "40px",
    borderTop: "4px solid #026873",
    borderLeft: "4px solid #026873",
    borderTopLeftRadius: "10px",
  },
  cornerTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "40px",
    height: "40px",
    borderTop: "4px solid #026873",
    borderRight: "4px solid #026873",
    borderTopRightRadius: "10px",
  },
  cornerBottomLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "40px",
    height: "40px",
    borderBottom: "4px solid #026873",
    borderLeft: "4px solid #026873",
    borderBottomLeftRadius: "10px",
  },
  cornerBottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: "40px",
    height: "40px",
    borderBottom: "4px solid #026873",
    borderRight: "4px solid #026873",
    borderBottomRightRadius: "10px",
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
    backgroundColor: "#f0f0f0",
    color: "#000",
    border: "1px solid #04BFBF",
    marginBottom: "10px",
    outline: "none",
  },
  enterButton: {
    width: "90%",
    maxWidth: "300px",
    padding: "12px",
    fontSize: "16px",
    borderRadius: "6px",
    backgroundColor: "#026873",
    color: "#ffffff",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
    marginBottom: "10px",
  },
  backButton: {
    width: "80%",
    maxWidth: "260px",
    padding: "12px",
    fontSize: "16px",
    borderRadius: "6px",
    backgroundColor: "#ffffff",
    color: "#04BFBF",
    border: "2px solid #04BFBF",
    fontWeight: "bold",
    cursor: "pointer",
  },
};

export default QRScanner;

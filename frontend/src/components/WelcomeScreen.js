import React from "react";
import { useNavigate } from "react-router-dom";

const WelcomeScreen = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <h1>Welcome to Sparx EV Charging</h1>
      <p>Login to access all features or explore the app.</p>

      <button style={styles.button} onClick={() => navigate("/login")}>
        Login
      </button>
      <button style={styles.exploreButton} onClick={() => navigate("/home")}>
        Explore
      </button>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    textAlign: "center",
  },
  button: {
    marginTop: "20px",
    padding: "10px 20px",
    fontSize: "18px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  exploreButton: {
    marginTop: "10px",
    padding: "10px 20px",
    fontSize: "18px",
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};

export default WelcomeScreen;

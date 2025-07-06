// src/components/FooterNav.js
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const FooterNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div style={styles.floatingNav}>
      <button
        onClick={() => navigate("/home")}
        style={{
          ...styles.button,
          ...(currentPath === "/home" ? styles.activeButton : {}),
        }}
      >
        Home
      </button>
      <button
        onClick={() => navigate("/sessions")}
        style={{
          ...styles.button,
          ...(currentPath === "/sessions" ? styles.activeButton : {}),
        }}
      >
        Sessions
      </button>
      <button
        onClick={() => navigate("/profile")}
        style={{
          ...styles.button,
          ...(currentPath === "/profile" ? styles.activeProfileButton : {}),
        }}
      >
        Profile
      </button>
    </div>
  );
};

const styles = {
  floatingNav: {
    position: "fixed",
    bottom: "15px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "90%",
    display: "flex",
    justifyContent: "space-between",
    zIndex: 100,
    maxWidth: "420px",
  },
  button: {
    flex: 1,
    padding: "12px",
    fontSize: "14px",
    margin: "0 5px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#193f4a",
    color: "#cdebf5",
    cursor: "pointer",
    boxShadow: "0 0 8px #86c6d7",
    transition: "all 0.3s ease",
  },
  activeButton: {
    backgroundColor: "#00fff7",
    color: "#000",
    fontWeight: "bold",
  },
  activeProfileButton: {
    backgroundColor: "#ff9100",
    color: "#0f1a1d",
    fontWeight: "bold",
  },
};

export default FooterNav;

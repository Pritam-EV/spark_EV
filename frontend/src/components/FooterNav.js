import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const FooterNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const footerStyles = {
    buttonContainer: {
      position: "fixed",
      bottom: "15px",
      left: "50%",
      transform: "translateX(-50%)",
      width: "90%",
      display: "flex",
      justifyContent: "space-between",
      zIndex: 1001,
    },
    button: {
      flex: 1,
      padding: "12px",
      fontSize: "14px",
      margin: "0 5px",
      borderRadius: "6px",
      border: "none",
      backgroundColor: "#193f4a",
      color: "#cdebf5",
      cursor: "pointer",
      boxShadow: "0 0 8px #86c6d7",
      transition: "all 0.3s ease",
    },
    scanButton: {
      flex: 1,
      padding: "12px",
      fontSize: "14px",
      margin: "0 5px",
      borderRadius: "6px",
      border: "none",
      backgroundColor: "#04BFBF",
      color: "#ffffff",
      fontWeight: "bold",
      cursor: "pointer",
      boxShadow: "0 0 12px #04BFBF",
      transition: "all 0.3s ease",
    },
    active: {
      border: "2px solid #F2CB05",
    },
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div style={footerStyles.buttonContainer}>
      <button
        onClick={() => navigate("/sessions")}
        style={{
          ...footerStyles.button,
          ...(isActive("/sessions") ? footerStyles.active : {}),
        }}
      >
        Sessions
      </button>
      <button
        onClick={() => navigate("/home")}
        style={{
          ...footerStyles.scanButton,
          ...(isActive("/home") ? footerStyles.active : {}),
        }}
      >
        Home
      </button>
      <button
        onClick={() => navigate("/profile")}
        style={{
          ...footerStyles.button,
          ...(isActive("/profile") ? footerStyles.active : {}),
        }}
      >
        Profile
      </button>
    </div>
  );
};

export default FooterNav;

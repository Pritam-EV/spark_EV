import React from "react";
import { useNavigate } from "react-router-dom";

const FooterNav = () => {
  const navigate = useNavigate();

  return (
    <div className="bottom-bar">
      <button onClick={() => navigate("/sessions")} className="home-button">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#04BFBF" strokeWidth="1" viewBox="0 0 24 24">
            <path d="M13 2L3 14h9v8l9-12h-9z"/>
          </svg>
          <span style={{ ...styles.buttonText, color: "#04BFBF" }}>Sessions</span>
        </div>
      </button>

      <button onClick={() => navigate("/home")} className="scan-button">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#fff" strokeWidth="1" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
          <span style={{ ...styles.buttonText, color: "#fff" }}>Home</span>
        </div>
      </button>

      <button onClick={() => navigate("/profile")} className="home-button">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#fff" strokeWidth="1" viewBox="0 0 24 24">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V22h19.2v-2.8c0-3.2-6.4-4.8-9.6-4.8z"/>
          </svg>
          <span style={{ ...styles.buttonText, color: "#fff" }}>Profile</span>
        </div>
      </button>
    </div>
  );
};

const styles = {
  buttonText: {
    fontFamily: "'Open Sans', sans-serif",
    fontSize: "9px",
    marginTop: "4px",
    color: "#cdebf5",
  },
};

export default FooterNav;

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SplashScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => {
      navigate("/welcome"); // Redirect after 2 seconds
    }, 2000);
  }, [navigate]);

  return (
    <div style={styles.container}>
      <img
        src="/logo.png" // Replace with your actual logo path
        alt="Logo"
        style={styles.logo}
      />
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000", // Theme background
    width: "480px", // Full viewport width
    height: "100vh", // Full viewport height
    margin: "0 auto", // Centers horizontally
  },
  logo: {
    width: "60%", // Makes it adaptive to screen size
    maxWidth: "200px", // Prevents excessive scaling
    height: "auto",
  },
};

export default SplashScreen;

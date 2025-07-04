import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/appStyles.css";


const Home = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [devices, setDevices] = useState([]);
  const [platform, setPlatform] = useState(null);
  const [ui, setUi] = useState(null);

  const HERE_API_KEY = "UV-_hV7ccZE4V0eSC-lva1uToSfKYksP-yCATEO-XN0";
  const API_URL = "https://spark-ev-backend.onrender.com/api/devices";
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await axios.get(API_URL);
        setDevices(response.data);
      } catch (error) {
        console.error("Error fetching devices:", error);
      }
    };

    fetchDevices();

    const loadScript = (url, callback) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.onload = callback;
      document.body.appendChild(script);
    };

    loadScript("https://js.api.here.com/v3/3.1/mapsjs-core.js", () => {
      loadScript("https://js.api.here.com/v3/3.1/mapsjs-service.js", () => {
        loadScript("https://js.api.here.com/v3/3.1/mapsjs-ui.js", () => {
          loadScript("https://js.api.here.com/v3/3.1/mapsjs-mapevents.js", () => {
            setScriptsLoaded(true);
          });
        });
      });
    });

    return () => {
      document.querySelectorAll("script[src*='here.com']").forEach((s) => s.remove());
    };
  }, []);

  useEffect(() => {
    if (scriptsLoaded && mapRef.current) {
      initMap();
    }
  }, [scriptsLoaded, mapRef]);

  const initMap = () => {
    const platformInstance = new window.H.service.Platform({ apikey: HERE_API_KEY });
    setPlatform(platformInstance);

    const defaultLayers = platformInstance.createDefaultLayers();
    const mapInstance = new window.H.Map(mapRef.current, defaultLayers.vector.normal.map, {
      zoom: 12,
      center: { lat: 18.5204, lng: 73.8567 },
    });

    new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(mapInstance));
    const uiInstance = window.H.ui.UI.createDefault(mapInstance, defaultLayers);
    uiInstance.removeControl("mapsettings");
    uiInstance.removeControl("zoom");
    uiInstance.removeControl("scalebar");

    setUi(uiInstance);
    setMap(mapInstance);
  };
    const getDirections = (lat, lng) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${lat},${lng}&travelmode=driving`;
        window.open(gmapsUrl, "_blank");
      },
      () => {
        const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(gmapsUrl, "_blank");
      }
    );
  };

   const showDevicePopup = (device, marker) => {
    if (!map || !ui) return;

    document.getElementById("custom-popup")?.remove();

    const popupDiv = document.createElement("div");
    popupDiv.id = "custom-popup";
    popupDiv.innerHTML = `
      <div id="popup-content" style="
        position: fixed;
        bottom: 60px;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        max-width: 400px;
        background: #FFFFFF;
        border-radius: 12px;
        box-shadow: 0 0 18px rgba(0,0,0,0.2);
        padding: 16px;
        font-family: 'Open Sans', sans-serif;
        color: #011F26;
        z-index: 1000;
      ">
        <button id="close-popup" style="
          position: absolute;
          top: 8px;
          right: 10px;
          background: transparent;
          border: none;
          font-size: 15px;
          color: #011F26;
          cursor: pointer;
        ">✖</button>

        <div style="display: flex; align-items: center;">
          <img src="/device-image.png" alt="Charger" style="
            width: 80px;
            height: 90px;
            border-radius: 8px;
            object-fit: cover;
            margin-right: 8px;
          " />

          <div style="flex: 1;">
            <div style="margin-bottom: 4px; font-size: 15px;">
              <strong> </strong> ${device.location}
            </div>
            <div style="margin-bottom: 4px; font-size: 15px;">
              <strong></strong> ${device.charger_type}
            </div>
            <div style="margin-bottom: 12px; display: flex; align-items: center;">
              <strong></strong> 
              <span style="
                display: inline-block;
                font-size: 15px;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background-color: ${device.status === "Available" ? "#20b000" : "#e00f00"};
                margin-left: 6px;
                margin-right: 6px;
              "></span>
              ${device.status}
            </div>
<div style="display: flex; gap: 8px;">
  <button id="connect-device" style="
    flex: 2;  /* Make this button wider */
    padding: 8px;
    background: #04BFBF;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    Connect with Charger
  </button>
  <button id="get-directions" style="
    flex: 0.6;  /* Make this button narrower */
    padding: 8px;
    background: #F2A007;
    color: #011F26;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" fill="#011F26">
      <path d="M12 2L3 21l9-4 9 4-9-19z"/>
    </svg>
  </button>
</div>

          </div>
        </div>
      </div>
    `;

    document.body.appendChild(popupDiv);

    setTimeout(() => {
      const closePopup = () => document.getElementById("custom-popup")?.remove();
      document.getElementById("close-popup")?.addEventListener("click", closePopup);

      const connectBtn = document.getElementById("connect-device");
      if (connectBtn && device.status === "Available") {
        connectBtn.addEventListener("click", () => {
          closePopup();
          window.location.href = "/qr-scanner";
        });
      }

      document.getElementById("get-directions")?.addEventListener("click", () => {
        closePopup();
        getDirections(device.lat, device.lng);
      });

      document.addEventListener(
        "click",
        (event) => {
          const popup = document.getElementById("custom-popup");
          if (popup && !popup.contains(event.target)) {
            popup.remove();
          }
        },
        { once: true }
      );
    }, 100);
  };

  useEffect(() => {
    if (map && devices.length > 0) {
      devices.forEach((device) => {
        if (typeof device.lat !== "number" || typeof device.lng !== "number") return;

        const location = new window.H.geo.Point(device.lat, device.lng);

        const svgMarkup = `
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
            <defs>
              <filter id="glow" height="300%" width="300%" x="-75%" y="-75%">
                <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#86c6d7"/>
                <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#ff9100"/>
              </filter>
            </defs>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"
                  fill="#0f1a1d" stroke="#ff9100" stroke-width="1.5" filter="url(#glow)" />
          </svg>
        `;
        const encoded = "data:image/svg+xml;base64," + btoa(svgMarkup);

        const icon = new window.H.map.Icon(encoded, {
          size: { w: 36, h: 36 },
          anchor: { x: 18, y: 36 },
        });

        const marker = new window.H.map.Marker(location, { icon });
        marker.setData(device);

        marker.addEventListener("tap", (event) => {
          const clickedDevice = event.target.getData();
          showDevicePopup(clickedDevice, marker);
        });

        map.addObject(marker);
      });
    }
  }, [map, devices, ui]);


  return (
<>
  <div className="top-bar">
    <img src="/logo.png" alt="Sparx Logo" className="top-bar-logo" />
  </div>
  <div className="home-container">
    <div ref={mapRef} className="map-container"></div>
    <div className="bottom-bar">
      <button onClick={() => navigate("/sessions")} className="home-button">Sessions</button>
      <button onClick={() => navigate("/home")} className="scan-button">Home</button>
      <button onClick={() => navigate("/profile")} className="home-button">Profile</button>
    </div>
    <button onClick={() => navigate("/qr-scanner")} className="qr-floating-button">
      <img src="/logo192.png" alt="QR Code" className="qr-icon" />
    </button>
  </div>
</>

  );
};

const styles = {
  qrFloatingButton: {
    position: "absolute",
    top: "80px",
    right: "20px",
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    backgroundColor: "#ff9100",
    border: "none",
    boxShadow: "0 0 12px #ff9100",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 1002,
  },

  qrIcon: {
    width: "28px",
    height: "28px",
    filter: "invert(10%) drop-shadow(0 0 2px #0f1a1d)",
  },

  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "50px",
    backgroundColor: "#0f1a1d",
    boxShadow: "0 2px 12px #86c6d7",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1002,
  },

  logo: {
    height: "70px",
    filter: "drop-shadow(0 0 6px #86c6d7)",
  },

  container: {
    width: "100%",
    height: "100vh",
    position: "relative",
    backgroundColor: "#0f1a1d",
  },
  mapContainer: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
  },
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
    flex: 1.5,
    padding: "12px",
    fontSize: "14px",
    margin: "0 5px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#ff9100",
    color: "#0f1a1d",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 0 10px #ff9100",
    transition: "all 0.3s ease",
  },
};

export default Home;
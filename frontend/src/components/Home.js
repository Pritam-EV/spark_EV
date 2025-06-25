import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";


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

  useEffect(() => {
    if (map && devices.length > 0) {
      const showDevicePopup = (device, marker) => {
        if (!map || !ui) return;

        document.getElementById("custom-popup")?.remove();

        const popupDiv = document.createElement("div");
        popupDiv.id = "custom-popup";
        popupDiv.innerHTML = `
        <div id="popup-content" style="
          width: 260px;
          padding: 16px;
          font-size: 14px;
          text-align: center;
          background: #0f1a1d;
          border-radius: 12px;
          box-shadow: 0 0 18px #86c6d7;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1000;
          color: #cdebf5;
          font-family: 'Segoe UI', sans-serif;
        ">
          <strong style="font-size: 16px; color: #ff9100;">${device.location}</strong><br/><br/>
          Status: <span style="color: ${device.status === "Available" ? "#20b000" : "#e00f00"};">
            ${device.status}
          </span><br/>
          Charger Type: <span style="color: #cdebf5;">${device.charger_type}</span><br/><br/>

          <button id="get-directions" style="
            padding: 8px 14px;
            margin: 6px 0;
            background: #86c6d7;
            color: #0f1a1d;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 0 8px #86c6d7;
          ">
            Get Directions
          </button><br/>

          <button id="connect-device" style="
            padding: 8px 14px;
            margin: 6px 0;
            background: #ff9100;
            color: #0f1a1d;
            font-weight: bold;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 0 8px #ff9100;
          ">
            Connect to Device
          </button>

          <button id="close-popup" style="
            position: absolute;
            top: 8px;
            right: 10px;
            background: transparent;
            border: none;
            font-size: 18px;
            color: #cdebf5;
            cursor: pointer;
          ">✖</button>
          
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

        setTimeout(() => {
          const lookAtData = map.getViewModel().getLookAtData();
          const bubblePos = marker.getGeometry();
          if (bubblePos.lat > lookAtData.position.lat + 0.01) {
            map.setCenter({ lat: bubblePos.lat - 0.005, lng: bubblePos.lng }, true);
          }
        }, 200);
      };

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

  const getDirections = (lat, lng) => {
    if (!map || !platform) return;

    navigator.geolocation.getCurrentPosition((position) => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      const routeUrl = `https://router.hereapi.com/v8/routes?transportMode=car&origin=${userLat},${userLng}&destination=${lat},${lng}&return=polyline,summary&apiKey=${HERE_API_KEY}`;

      fetch(routeUrl)
        .then((response) => {
          if (!response.ok) throw new Error("Failed to fetch route");
          return response.json();
        })
        .then((data) => {
          if (!data.routes || data.routes.length === 0) {
            alert("No route found!");
            return;
          }

          const route = data.routes[0];
          map.getObjects().forEach((obj) => {
            if (obj instanceof window.H.map.Polyline) {
              map.removeObject(obj);
            }
          });

          const lineString = new window.H.geo.LineString();

          route.sections.forEach((section) => {
            const decodedPolyline = window.H.geo.LineString.fromFlexiblePolyline(section.polyline);
            for (let i = 0; i < decodedPolyline.getPointCount(); i++) {
              const point = decodedPolyline.extractPoint(i);
              lineString.pushPoint(point);
            }
          });

          const routePolyline = new window.H.map.Polyline(lineString, {
            style: { strokeColor: "#86c6d7", lineWidth: 4 },
          });

          map.addObject(routePolyline);
          map.getViewModel().setLookAtData({ bounds: routePolyline.getBoundingBox() });

          setTimeout(() => {
            if (window.confirm("Open Google Maps for navigation?")) {
              window.open(`https://www.google.com/maps/dir/${userLat},${userLng}/${lat},${lng}/`, "_blank");
            }
          }, 500);
        })
        .catch((error) => console.error("Error fetching route:", error));
    });
  };

  return (
    <>
      <style>{`
        html, body, #root {
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background-color: #0f1a1d;
        }
      `}</style>
      <div style={styles.topBar}>
        <img src="/logo.png" alt="Sparx Logo" style={styles.logo} />
      </div>
      <div style={styles.container}>
        <div ref={mapRef} style={styles.mapContainer}></div>
        <div style={styles.buttonContainer}>
          <button onClick={() => navigate("/sessions")} style={styles.button}>Sessions</button>
          <button onClick={() => navigate("/home")} style={styles.scanButton}>Home</button>
          <button onClick={() => navigate("/profile")} style={styles.button}>Profile</button>
        </div>

        <button onClick={() => navigate("/qr-scanner")} style={styles.qrFloatingButton}>
          <img src="/logo192.png" alt="QR Code" style={styles.qrIcon} />
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
    bottom: "0px",
    left: "0%",
    transform: "translateX(-50%)",
    width: "90%",
    display: "flex",
    justifyContent: "space-between",
    padding: "10px" ,
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
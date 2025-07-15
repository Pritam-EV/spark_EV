import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import SplashScreen from "./components/SplashScreen";
import WelcomeScreen from "./components/WelcomeScreen";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import Home from "./components/Home";
import Profile from "./components/Profile";
import SessionPage from "./components/SessionPage";
import ChargingOptions from "./components/ChargingOptions";
import PrivateRoute from "./components/PrivateRoute";
import QRScanner from "./components/QRScanner";
import SessionSummary from "./components/SessionSummary";
import SessionStart from "./components/SessionStart";
import LiveSession from "./components/LiveSession";

const AppContent = () => {
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem("splashShown"));
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem("user"); // ✅ Check login state

  useEffect(() => {
    if (showSplash) {
      setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem("splashShown", "true"); // ✅ Prevent splash from showing again
      }, 2000);
    }
  }, [showSplash]);

  useEffect(() => {
    sessionStorage.setItem("lastPage", location.pathname);
  }, [location]);

  if (showSplash) return <SplashScreen />;

  return (
    <div className="app-container">
    <Routes>
      {/* 🔥 FIXED: "Explore" now redirects to Home instead of Login */}
      <Route path="/" element={<WelcomeScreen />} />
      <Route path="/home" element={<Home />} />

      {/* 🔒 Auth Routes */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/home" replace /> : <Login />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/home" replace /> : <SignUp />} />

      {/* 🔒 Private Routes (Require Login) */}
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/sessions" element={<PrivateRoute><SessionPage /></PrivateRoute>} />
      <Route path="/qr-scanner" element={<PrivateRoute><QRScanner /></PrivateRoute>} />
      <Route path="/charging-options/:device_id" element={<PrivateRoute><ChargingOptions /></PrivateRoute>} />
      <Route path="/session-summary" element={<SessionSummary />} />
      <Route path="/session-start/:transactionId" element={<PrivateRoute><SessionStart /></PrivateRoute>} />
      <Route path="/live-session/:sessionId" element={<PrivateRoute><LiveSession /></PrivateRoute>} />
      <Route path="/session-start/:deviceId/:transactionId" element={ <PrivateRoute> <SessionStartPage /> </PrivateRoute> } />

      {/* Default Redirect */}
      <Route path="*" element={<Navigate to="/home" />} />
    </Routes>
    </div>
  );
};

const App = () => (
  <Router>
    <AppContent />
  </Router>
);

export default App;

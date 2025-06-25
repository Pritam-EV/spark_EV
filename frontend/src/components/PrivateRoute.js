import React from "react";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children }) => {
  const rawUser = localStorage.getItem("user");
  let user = null;

  try {
    user = rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    console.error("Error parsing user from localStorage:", error);
    localStorage.removeItem("user"); // Clear corrupted data
  }

  console.log("🔍 Checking Auth - User:", user);

  // ✅ Allow access if user exists
  if (user && typeof user === "object" && Object.keys(user).length > 0) {
    return children;
  }

  console.warn("🔴 User not authenticated, redirecting to login...");
  return <Navigate to="/login" replace />;
};

export default PrivateRoute;

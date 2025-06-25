import React, { useState, useEffect } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [userData, setUserData] = useState({
    name: "",
    mobile: "",
    vehicleType: "",
    email: "",
    googleId: "",
  });

  useEffect(() => {
    console.log("Updated User Data:", userData);
  }, [userData]);

  const handleGoogleLogin = async (response) => {
    setLoading(true);
    setError("");

    try {
      console.log("Google Login Response:", response);

      if (!response.credential) {
        setError("Google authentication failed. Please try again.");
        setLoading(false);
        return;
      }

      const res = await axios.post("http://localhost:5000/api/auth/google", {
        token: response.credential,
      });

      console.log("Google Login Success:", res.data);
localStorage.setItem("token", res.data.token);
localStorage.setItem("user", JSON.stringify(res.data.user));



      if (res.data.isNewUser) {
        console.log("🔹 First-time user detected. Showing signup form...");
        setIsNewUser(true);

        // ✅ Correctly update email & googleId
        setUserData((prevData) => ({
          ...prevData,
          email: res.data.email || "",
          googleId: res.data.googleId || "",
        }));

        console.log("✅ UserData After Google Login Update:", {
          email: res.data.email,
          googleId: res.data.googleId,
        });
      } else {
        console.log("✅ Redirecting to Home...");
        navigate("/home", { replace: true });
      }
    } catch (error) {
      console.error("Google Login Failed:", error);
      setError("Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("✅ Updated User Data (After State Change):", userData);
  }, [userData]);

  const handleGoogleLoginFailure = () => {
    setError("Google Login Failed. Please try again.");
  };

  const handleSignup = async () => {
    setError("");
    setLoading(true);

    console.log("🟡 User Data Before Signup:", userData);

    const { name, mobile, vehicleType, email, googleId } = userData;

    if (![name, mobile, vehicleType, email, googleId].every((field) => field && field.trim())) {
      setError("All fields are required.");
      console.log("❌ Missing Fields:", { name, mobile, vehicleType, email, googleId });
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/api/auth/signup", {
        name,
        mobile,
        vehicleType,
        email,
        googleId,
      });

      console.log("✅ Signup Success:", res.data);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      navigate("/home", { replace: true });
    } catch (error) {
      console.error("Signup Failed:", error);
      setError("Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2>{isNewUser ? "Complete Your Signup" : "Login"}</h2>
      {error && <p style={styles.error}>{error}</p>}

      {!isNewUser ? (
        <>
          <GoogleLogin onSuccess={handleGoogleLogin} onError={handleGoogleLoginFailure} />
        </>
      ) : (
        <>
          <input
            type="text"
            placeholder="Enter Name"
            value={userData.name}
            onChange={(e) => setUserData({ ...userData, name: e.target.value })}
            style={styles.input}
          />

          <input
            type="tel"
            placeholder="Enter Mobile Number"
            value={userData.mobile}
            onChange={(e) => setUserData({ ...userData, mobile: e.target.value })}
            style={styles.input}
          />

          <select
            value={userData.vehicleType}
            onChange={(e) => setUserData({ ...userData, vehicleType: e.target.value })}
            style={styles.input}
          >
            <option value="">Select Vehicle Type</option>
            <option value="2-wheeler">2-Wheeler</option>
            <option value="3-wheeler">3-Wheeler</option>
            <option value="4-wheeler">4-Wheeler</option>
            <option value="all">All Vehicles</option>
          </select>

          <button onClick={handleSignup} style={styles.button} disabled={loading}>
            {loading ? "Processing..." : "Complete Signup"}
          </button>
        </>
      )}
    </div>
  );
};

// Styles
const styles = {
  container: {
    textAlign: "center",
    padding: "20px",
    maxWidth: "400px",
    margin: "auto",
  },
  error: {
    color: "red",
    fontSize: "14px",
    marginBottom: "10px",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "16px",
  },
  button: {
    width: "100%",
    padding: "12px",
    fontSize: "16px",
    borderRadius: "5px",
    border: "none",
    backgroundColor: "#007bff",
    color: "white",
    cursor: "pointer",
  },
};

export default Login;

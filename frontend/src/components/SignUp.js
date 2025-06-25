import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase"; // Firebase authentication

const SignUp = () => {
  const [input, setInput] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await createUserWithEmailAndPassword(auth, input.email, input.password);
      navigate("/home"); // Redirect to Home Page after signup
    } catch (err) {
      setError("Signup failed. Please try again.");
    }
  };

  return (
    <div style={styles.container}>
      <h2>Sign Up</h2>
      {error && <p style={styles.error}>{error}</p>}

      <input
        type="text"
        name="name"
        placeholder="Full Name"
        value={input.name}
        onChange={handleChange}
        style={styles.input}
      />

      <input
        type="text"
        name="email"
        placeholder="Phone or Email"
        value={input.email}
        onChange={handleChange}
        style={styles.input}
      />

      <input
        type="password"
        name="password"
        placeholder="Password"
        value={input.password}
        onChange={handleChange}
        style={styles.input}
      />

      <button onClick={handleSignup} style={styles.button}>
        Sign Up
      </button>

      <p style={styles.text}>
        Already have an account?{" "}
        <span onClick={() => navigate("/login")} style={styles.link}>
          Login
        </span>
      </p>
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
  input: {
    width: "250px",
    padding: "10px",
    margin: "10px 0",
    fontSize: "16px",
    border: "1px solid #ccc",
    borderRadius: "5px",
  },
  button: {
    padding: "10px 20px",
    fontSize: "18px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  text: {
    marginTop: "10px",
  },
  link: {
    color: "#007bff",
    cursor: "pointer",
    textDecoration: "underline",
  },
  error: {
    color: "red",
    fontSize: "14px",
  },
};

export default SignUp;

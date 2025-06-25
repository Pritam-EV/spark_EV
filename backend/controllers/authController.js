const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
require("dotenv").config(); // Load environment variables

// ✅ Use environment variable for JWT secret
const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const token = jwt.sign(
  { userId: user._id }, // ✅ use `userId` here
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
  );

// ✅ Google Auth Client
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// 📌 Google Login Handler
const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token is required" });

    // ✅ Verify Google Token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const { email, sub: googleId, name } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      console.log("🔹 New Google user detected. Redirecting to signup...");
      return res.status(200).json({ isNewUser: true, email, googleId });
    }

       if (!user.googleId) {
             user.googleId = googleId;  // ✅ Save Google ID if missing
             await user.save();
           }

    // ✅ Generate JWT token
    const jwtToken = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({ token: jwtToken, user, isNewUser: false });
  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(500).json({ message: "Google login failed" });
  }
};

// 📌 Signup Handler
const signup = async (req, res) => {
  try {
    const { name, mobile, vehicleType, email, googleId } = req.body;

    // ✅ Validate all fields
    if (!name || !mobile || !vehicleType || !email || !googleId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // ✅ Create new user
    const newUser = new User({
      name,
      mobile,
      vehicleType,
      email,
      googleId: googleId ? googleId : undefined,  // ✅ Save Google ID only if provided
    });


    await newUser.save();

    // ✅ Generate JWT token
    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({ token, user: newUser });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Signup failed" });
  }
};



module.exports = { googleLogin, signup };

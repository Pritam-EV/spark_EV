const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log("🔑 Received Authorization Header:", authHeader);
    console.log('Incoming Authorization header:', req.headers.authorization);

    if (!authHeader) {
        console.error("⚠️ No Authorization header found");
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1]; // Ensure correct extraction
    console.log("📌 Extracted Token:", token);

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            // Specific error handling for expired token
            if (err.name === 'TokenExpiredError') {
                console.error("❌ JWT Token Expired:", err.message);
                return res.status(403).json({ error: "Token has expired. Please log in again." });
            }
            console.error("❌ JWT Verification Failed:", err.message);
            return res.status(403).json({ error: "Invalid token" });
        }

        if (!decoded.userId) {
            console.error("❌ Token missing userId field:", decoded);
            return res.status(403).json({ error: "Invalid token: userId not found" });
        }

        console.log("✅ Token Verified! Decoded Data:", decoded);
        req.user = { userId: decoded.userId }; // ✅ Explicitly set `userId`
        
        next();
    });
};

module.exports = authMiddleware;

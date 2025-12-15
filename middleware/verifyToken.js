const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  try {
    // 🔐 Read token from HTTP-only cookie
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized access. No token provided.",
      });
    }

    // 🔍 Verify JWT token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          message: "Forbidden. Invalid or expired token.",
        });
      }

      // ✅ Attach decoded user info to request
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error("verifyToken error:", error);
    res.status(500).json({
      message: "Internal server error during token verification",
    });
  }
};

module.exports = verifyToken;

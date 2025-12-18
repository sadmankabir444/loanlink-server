const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  try {
    // 1️⃣ cookie থেকে token নাও
    let token = req.cookies?.token;

    // 2️⃣ cookie না থাকলে header থেকে নাও
    if (!token && req.headers.authorization) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 3️⃣ token না থাকলে
    if (!token) {
      return res.status(401).json({
        message: "Unauthorized access. No token provided.",
      });
    }

    // 4️⃣ verify
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          message: "Forbidden. Invalid or expired token.",
        });
      }

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

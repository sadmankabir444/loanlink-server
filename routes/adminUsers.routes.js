const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const verifyJWT = require("../middleware/verifyToken"); // existing verifyToken middleware

// Inline admin check middleware since verifyAdmin.js is missing
const verifyAdmin = (req, res, next) => {
  // assuming req.user is set by verifyJWT
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Forbidden: Admins only" });
};

// =======================
// GET all users
// =======================
router.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
  const usersCollection = req.app.locals.usersCollection;
  const search = req.query.search || "";

  const query = {
    $or: [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ],
  };

  const users = await usersCollection.find(query).toArray();
  res.send(users);
});

// =======================
// Update user role
// =======================
router.patch("/users/role/:id", verifyJWT, verifyAdmin, async (req, res) => {
  const usersCollection = req.app.locals.usersCollection;
  const { role } = req.body;

  const result = await usersCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { role } }
  );

  res.send(result);
});

// =======================
// Suspend user
// =======================
router.patch("/users/suspend/:id", verifyJWT, verifyAdmin, async (req, res) => {
  const usersCollection = req.app.locals.usersCollection;
  const { reason, feedback } = req.body;

  const result = await usersCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    {
      $set: {
        status: "suspended",
        suspendReason: reason,
        suspendFeedback: feedback,
      },
    }
  );

  res.send(result);
});

// =======================
// Activate user
// =======================
router.patch("/users/activate/:id", verifyJWT, verifyAdmin, async (req, res) => {
  const usersCollection = req.app.locals.usersCollection;

  const result = await usersCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status: "active" } }
  );

  res.send(result);
});

module.exports = router;

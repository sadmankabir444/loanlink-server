const express = require("express");
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken"); // JWT middleware

function userRoutes(db) {
  const router = express.Router();
  const userCollection = db.collection("users");

  // =============================
  // 1. Register / Create User
  // =============================
  router.post("/register", async (req, res) => {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }

      const exists = await userCollection.findOne({ email });
      if (exists) {
        return res.status(400).json({ success: false, message: "User already exists" });
      }

      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = {
        name,
        email,
        password: hashedPassword,
        role: role || "borrower",
        suspended: false,
        createdAt: new Date(),
      };

      const result = await userCollection.insertOne(user);

      res.json({ success: true, message: "User created successfully", id: result.insertedId });
    } catch (err) {
      console.error("Register Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =============================
  // 2. Get All Users (Admin only)
  // =============================
  router.get("/", verifyToken, async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Admin only access" });
      }

      const users = await userCollection.find().toArray();
      res.json({ success: true, count: users.length, users });
    } catch (err) {
      console.error("Fetch Users Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =============================
  // 3. Get Single User by Email (Admin only)
  // =============================
  router.get("/:email", verifyToken, async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Admin only access" });
      }

      const email = req.params.email;
      const user = await userCollection.findOne({ email });
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      res.json({ success: true, user });
    } catch (err) {
      console.error("Get User Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =============================
  // 4. Update User Role (Admin only)
  // =============================
  router.patch("/role/:id", verifyToken, async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Admin only access" });
      }

      const id = req.params.id;
      const { role } = req.body;

      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } }
      );

      res.json({ success: true, message: "User role updated", result });
    } catch (err) {
      console.error("Update Role Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =============================
  // 5. Suspend / Unsuspend User (Admin only)
  // =============================
  router.patch("/suspend/:id", verifyToken, async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Admin only access" });
      }

      const id = req.params.id;
      const { suspended, reason } = req.body; // suspended = true/false

      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { suspended, reason } }
      );

      res.json({
        success: true,
        message: suspended ? "User suspended" : "User unsuspended",
        result,
      });
    } catch (err) {
      console.error("Suspend User Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

module.exports = userRoutes;

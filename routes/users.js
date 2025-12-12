const express = require("express");
const { ObjectId } = require("mongodb");

function userRoutes(db) {
  const router = express.Router();
  const userCollection = db.collection("users");

  // =============================
  // 1. Register / Create User
  // =============================
  router.post("/", async (req, res) => {
    try {
      const user = req.body;

      // Check if user already exists
      const exists = await userCollection.findOne({ email: user.email });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Default role = borrower
      user.role = user.role || "borrower";
      user.suspended = false; // default not suspended
      user.createdAt = new Date();

      const result = await userCollection.insertOne(user);

      res.json({
        success: true,
        message: "User created successfully",
        id: result.insertedId,
      });
    } catch (error) {
      console.error("Create User Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =============================
  // 2. Get All Users
  // =============================
  router.get("/", async (req, res) => {
    try {
      const users = await userCollection.find().toArray();
      res.json({
        success: true,
        count: users.length,
        users,
      });
    } catch (error) {
      console.error("Fetch Users Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =============================
  // 3. Get Single User by Email
  // =============================
  router.get("/:email", async (req, res) => {
    try {
      const email = req.params.email;
      const user = await userCollection.findOne({ email });

      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      res.json({ success: true, user });
    } catch (error) {
      console.error("Get User Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =============================
  // 4. Update User Role
  // =============================
  router.patch("/role/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const { role } = req.body;

      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } }
      );

      res.json({
        success: true,
        message: "User role updated",
        result,
      });
    } catch (error) {
      console.error("Update User Role Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =============================
  // 5. Update / Suspend User
  // =============================
  router.patch("/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const updateData = req.body; // e.g., { suspended: true, reason: "Violation" }

      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      res.json({
        success: true,
        message: "User updated successfully",
        result,
      });
    } catch (error) {
      console.error("Update User Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = userRoutes;

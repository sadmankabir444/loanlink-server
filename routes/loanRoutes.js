const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");

module.exports = (db) => {
  const loanCollection = db.collection("loans");

  // ============================
  // 1. Create Loan Request (POST)
  // ============================
  router.post("/", async (req, res) => {
    try {
      const loanData = req.body;

      if (!loanData.name || !loanData.amount || !loanData.purpose) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      loanData.status = "pending";
      loanData.createdAt = new Date();

      const result = await loanCollection.insertOne(loanData);

      res.status(201).json({
        message: "Loan request created successfully",
        loanId: result.insertedId,
      });
    } catch (error) {
      res.status(500).json({ message: "Error creating loan", error });
    }
  });

  // =============================
  // 2. Get ALL loan requests (GET)
  // =============================
  router.get("/", async (req, res) => {
    try {
      const loans = await loanCollection.find().toArray();
      res.json(loans);
    } catch (error) {
      res.status(500).json({ message: "Error fetching loans", error });
    }
  });

  // =============================
  // 3. Update loan status (PATCH) — PROTECTED
  // =============================
  router.patch("/:id", verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const { ObjectId } = require("mongodb");

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const result = await loanCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } }
      );

      res.json({ message: "Loan status updated", result });
    } catch (error) {
      res.status(500).json({ message: "Error updating status", error });
    }
  });

  return router;
};

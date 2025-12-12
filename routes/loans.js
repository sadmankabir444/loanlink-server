const express = require("express");
const { ObjectId } = require("mongodb");

function loanRoutes(db) {
  const router = express.Router();
  const loanCollection = db.collection("loans");

  // =============================
  // 1. Create a new loan request
  // =============================
  router.post("/", async (req, res) => {
    try {
      const loanData = req.body;
      loanData.status = loanData.status || "pending";
      loanData.createdAt = new Date();

      const result = await loanCollection.insertOne(loanData);

      res.json({
        success: true,
        message: "Loan request created successfully!",
        id: result.insertedId,
      });
    } catch (error) {
      console.error("Create Loan Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =============================
  // 2. Get all loans (with optional limit)
  // =============================
  router.get("/", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 0;
      const loans = await loanCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      res.json({
        success: true,
        count: loans.length,
        loans,
      });
    } catch (error) {
      console.error("Fetch Loans Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =============================
  // 3. Get single loan by ID
  // =============================
  router.get("/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const loan = await loanCollection.findOne({ _id: new ObjectId(id) });

      if (!loan) {
        return res.status(404).json({ success: false, error: "Loan not found" });
      }

      res.json({ success: true, loan });
    } catch (error) {
      console.error("Get Loan Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ======================================
  // 4. Update loan status (approve/reject)
  // ======================================
  router.patch("/:id/status", async (req, res) => {
    try {
      const id = req.params.id;
      const { status } = req.body;

      const result = await loanCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } }
      );

      res.json({
        success: true,
        message: "Loan status updated",
        result,
      });
    } catch (error) {
      console.error("Update Loan Status Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =============================
  // 5. Update loan (any fields)
  // =============================
  router.patch("/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const updateData = req.body;

      const result = await loanCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      res.json({
        success: true,
        message: "Loan updated successfully",
        result,
      });
    } catch (error) {
      console.error("Update Loan Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =============================
  // 6. Delete loan
  // =============================
  router.delete("/:id", async (req, res) => {
    try {
      const id = req.params.id;

      const result = await loanCollection.deleteOne({ _id: new ObjectId(id) });

      res.json({
        success: true,
        message: "Loan deleted successfully",
        result,
      });
    } catch (error) {
      console.error("Delete Loan Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = loanRoutes;

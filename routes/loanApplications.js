const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { getDb } = require("../utils/db");

// Get all loan applications (optional query by userEmail)
router.get("/", async (req, res) => {
  try {
    const db = getDb();
    const query = {};
    if (req.query.userEmail) query.userEmail = req.query.userEmail;
    const applications = await db.collection("loanApplications").find(query).toArray();
    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch loan applications" });
  }
});

// Get single application by ID
router.get("/:id", async (req, res) => {
  try {
    const db = getDb();
    const app = await db.collection("loanApplications").findOne({ _id: new ObjectId(req.params.id) });
    if (!app) return res.status(404).json({ error: "Application not found" });
    res.json(app);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch application" });
  }
});

// Add new loan application
router.post("/", async (req, res) => {
  try {
    const db = getDb();
    const application = req.body;
    application.createdAt = new Date();
    const result = await db.collection("loanApplications").insertOne(application);
    res.json({ insertedId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add application" });
  }
});

// Update application (PATCH)
router.patch("/:id", async (req, res) => {
  try {
    const db = getDb();
    const updateData = req.body;
    await db.collection("loanApplications").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );
    res.json({ message: "Application updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update application" });
  }
});

module.exports = router;

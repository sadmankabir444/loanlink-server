const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken"); // ✅ correct existing file

// ✅ inline manager middleware (verifyManager.js নাই বলে)
const verifyManager = (req, res, next) => {
  if (req.user && (req.user.role === "manager" || req.user.role === "admin")) {
    return next();
  }
  return res.status(403).json({ message: "Forbidden: Manager access only" });
};

module.exports = (db) => {
  const applicationsCollection = db.collection("loanApplications");

  // =============================
  // GET PENDING APPLICATIONS
  // =============================
  router.get(
    "/pending-applications",
    verifyToken,
    verifyManager,
    async (req, res) => {
      const applications = await applicationsCollection
        .find({ status: "Pending" })
        .toArray();

      res.send(applications);
    }
  );

  // =============================
  // GET APPROVED APPLICATIONS
  // =============================
  router.get(
    "/approved-applications",
    verifyToken,
    verifyManager,
    async (req, res) => {
      const applications = await applicationsCollection
        .find({ status: "Approved" })
        .toArray();

      res.send(applications);
    }
  );

  // =============================
  // UPDATE APPLICATION STATUS
  // =============================
  router.patch(
    "/application-status/:id",
    verifyToken,
    verifyManager,
    async (req, res) => {
      const { status, feedback } = req.body;

      const result = await applicationsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        {
          $set: {
            status,
            managerFeedback: feedback || "",
            updatedAt: new Date(),
          },
        }
      );

      res.send(result);
    }
  );

  return router;
};

const express = require("express");
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

// =======================
// ADMIN GUARD
// =======================
const verifyAdmin = (req, res, next) => {
  if (req.user?.role === "admin") return next();
  return res.status(403).json({ message: "Admins only" });
};

module.exports = (db) => {
  const loansCollection = db.collection("loans");
  const applicationsCollection = db.collection("loanApplications");

  // =======================
  // GET ALL LOANS
  // =======================
  router.get("/all-loans", verifyToken, verifyAdmin, async (req, res) => {
    const loans = await loansCollection.find().toArray();
    res.send(loans);
  });

  // =======================
  // TOGGLE SHOW ON HOME
  // =======================
  router.patch(
    "/loan/show-home/:id",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
      const { showOnHome } = req.body;

      const result = await loansCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { showOnHome } }
      );

      res.send(result);
    }
  );

  // =======================
  // UPDATE LOAN
  // =======================
  router.patch(
    "/loan/update/:id",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
      const result = await loansCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
      );
      res.send(result);
    }
  );

  // =======================
  // DELETE LOAN
  // =======================
  router.delete(
    "/loan/:id",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
      const result = await loansCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    }
  );

  // =======================
  // GET LOAN APPLICATIONS (ADMIN)
  // =======================
  router.get(
    "/loan-applications",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
      const { status, page = 1, limit = 5 } = req.query;
      const query = {};
      if (status && status !== "all") query.status = status;

      const skip = (page - 1) * limit;

      const applications = await applicationsCollection
        .find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const total = await applicationsCollection.countDocuments(query);

      res.send({ applications, total });
    }
  );

  return router;
};

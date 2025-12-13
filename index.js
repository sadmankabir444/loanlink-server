const express = require("express");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const corsConfig = require("./middleware/corsConfig");

const app = express();
const port = process.env.PORT || 5000;

// =======================
// Middleware
// =======================
app.use(corsConfig);
app.use(express.json());

// =======================
// MongoDB URI (FIXED)
// =======================
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

// Mongo Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect DB
    await client.connect();
    console.log("MongoDB Connected");

    const db = client.db(process.env.DB_NAME);
    const usersCollection = db.collection("users");
    const loansCollection = db.collection("loans");
    const applicationsCollection = db.collection("loanApplications");

    // =======================
    // USERS ROUTES
    // =======================

    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        const exists = await usersCollection.findOne({ email: user.email });

        if (exists) {
          return res.status(400).send({ message: "User already exists" });
        }

        user.role = user.role || "borrower";
        user.createdAt = new Date();

        const result = await usersCollection.insertOne(user);
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.get("/users", async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    app.get("/users/:email", async (req, res) => {
      const user = await usersCollection.findOne({ email: req.params.email });
      res.send(user);
    });

    // =======================
    // LOANS ROUTES
    // =======================

    app.post("/loans", async (req, res) => {
      const loan = req.body;
      loan.createdAt = new Date();
      loan.status = loan.status || "pending";

      const result = await loansCollection.insertOne(loan);
      res.send(result);
    });

    app.get("/loans", async (req, res) => {
      const limit = parseInt(req.query.limit);
      const cursor = loansCollection.find().sort({ createdAt: -1 });

      const loans = limit
        ? await cursor.limit(limit).toArray()
        : await cursor.toArray();

      res.send(loans);
    });

    app.get("/loans/:id", async (req, res) => {
      const loan = await loansCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(loan);
    });

    app.delete("/loans/:id", async (req, res) => {
      const result = await loansCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    // =======================
    // LOAN APPLICATIONS
    // =======================

    app.post("/loan-applications", async (req, res) => {
      const application = req.body;
      application.createdAt = new Date();
      application.status = "pending";

      const result = await applicationsCollection.insertOne(application);
      res.send(result);
    });

    app.get("/loan-applications", async (req, res) => {
      const { email, status } = req.query;
      const query = {};

      if (email) query.email = email;
      if (status) query.status = status;

      const result = await applicationsCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/loan-applications/:id", async (req, res) => {
      const update = req.body;

      const result = await applicationsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: update }
      );

      res.send(result);
    });

    // =======================
    // HEALTH CHECK
    // =======================
    app.get("/", (req, res) => {
      res.send("LoanLink Server Running 🚀");
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

run();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

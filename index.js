const express = require("express");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

// Routes
const adminUsersRoutes = require("./routes/adminUsers.routes");
const adminLoansRoutes = require("./routes/adminLoans.routes");
const managerLoansRoutes = require("./routes/managerLoans.routes");

const app = express();
const port = process.env.PORT || 3000;

/* =======================
   Middleware
======================= */
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

/* =======================
   MongoDB Connection
======================= */
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

/* =======================
   Main Server Function
======================= */
async function run() {
  try {
    await client.connect();
    console.log("✅ MongoDB Connected");

    const db = client.db(process.env.DB_NAME);
    const usersCollection = db.collection("users");
    const loansCollection = db.collection("loans");
    const applicationsCollection = db.collection("loanApplications");

    /* =======================
       USERS
    ======================= */

    // Register User
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

    // Get all users
    app.get("/users", async (req, res) => {
      try {
        const users = await usersCollection.find().toArray();
        res.send(users);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // Get single user by email
    app.get("/users/:email", async (req, res) => {
      try {
        const user = await usersCollection.findOne({
          email: req.params.email,
        });
        res.send(user);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    /* =======================
       LOGIN (JWT + COOKIE)
    ======================= */
    app.post("/login", async (req, res) => {
      try {
        const { email, password } = req.body;

        if (!email || !password) {
          return res
            .status(400)
            .json({ message: "Email and password required" });
        }

        const user = await usersCollection.findOne({ email });
        if (!user || user.password !== password) {
          return res
            .status(401)
            .json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
          {
            id: user._id,
            email: user.email,
            role: user.role,
          },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        res
          .cookie("token", token, {
            httpOnly: true,
            secure: false, // production এ true করবে
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
          })
          .json({
            success: true,
            user: {
              name: user.name,
              email: user.email,
              role: user.role,
            },
          });
      } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    /* =======================
       LOANS
    ======================= */

    // Create loan
    app.post("/loans", async (req, res) => {
      try {
        const loan = req.body;
        loan.createdAt = new Date();
        loan.status = loan.status || "pending";

        const result = await loansCollection.insertOne(loan);
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // Get all loans
    app.get("/loans", async (req, res) => {
      try {
        const limit = parseInt(req.query.limit);
        const cursor = loansCollection.find().sort({ createdAt: -1 });
        const loans = limit
          ? await cursor.limit(limit).toArray()
          : await cursor.toArray();

        res.send(loans);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // Get single loan
    app.get("/loans/:id", async (req, res) => {
      try {
        const loan = await loansCollection.findOne({
          _id: new ObjectId(req.params.id),
        });
        res.send(loan);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // Delete loan
    app.delete("/loans/:id", async (req, res) => {
      try {
        const result = await loansCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    /* =======================
       LOAN APPLICATIONS
    ======================= */

    // Apply loan
    app.post("/loan-applications", async (req, res) => {
      try {
        const application = req.body;
        application.createdAt = new Date();
        application.status = "Pending";
        application.feeStatus = "Unpaid";

        const result = await applicationsCollection.insertOne(application);
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // Get loan applications
    app.get("/loan-applications", async (req, res) => {
      try {
        const { email, status } = req.query;
        const query = {};
        if (email) query.email = email;
        if (status) query.status = status;

        const result = await applicationsCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // Update loan application
    app.patch("/loan-applications/:id", async (req, res) => {
      try {
        const result = await applicationsCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: req.body }
        );
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    /* =======================
       ROLE BASED ROUTES
    ======================= */
    app.use("/admin", adminUsersRoutes);
    app.use("/admin", adminLoansRoutes(db));
    app.use("/manager", managerLoansRoutes);

    /* =======================
       Health Check
    ======================= */
    app.get("/", (req, res) => {
      res.send("🚀 LoanLink Server Running");
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

/* =======================
   Start Server
======================= */
run();

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});

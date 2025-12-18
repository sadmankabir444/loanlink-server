// index.js (আপনার আগের কোডের সাথে merge)
const express = require("express");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const path = require("path");

// Routes
const adminUsersRoutes = require("./routes/adminUsers.routes");
const adminLoansRoutes = require("./routes/adminLoans.routes");
const managerLoansRoutes = require("./routes/managerLoans.routes");

const app = express();

const allowedOrigin =
  process.env.NODE_ENV === "production"
    ? "https://dreamy-blancmange-7324a2.netlify.app"
    : "http://localhost:5175";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.options("*", cors({ origin: allowedOrigin, credentials: true }));

app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", 1);
const port = process.env.PORT || 3000;

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
    console.log("✅ MongoDB Connected");
    const db = client.db(process.env.DB_NAME);
    const usersCollection = db.collection("users");
    const loansCollection = db.collection("loans");
    const applicationsCollection = db.collection("loanApplications");

    /* =======================
        JWT VERIFY MIDDLEWARE
    ======================= */
    const verifyToken = (req, res, next) => {
      const token = req.cookies?.token;
      if (!token) return res.status(401).json({ message: "Unauthorized" });

      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Forbidden" });
        req.user = decoded;
        next();
      });
    };

    /* =======================
        LOGIN (JWT + COOKIE)
    ======================= */
    app.post("/login", async (req, res) => {
      try {
        const { email, password } = req.body;
        if (!email)
          return res.status(400).json({ message: "Email is required" });

        let user = await usersCollection.findOne({ email });

        if (password) {
          if (!user || user.password !== password)
            return res
              .status(401)
              .json({ message: "Invalid email or password" });
        } else {
          if (!user) {
            const newUser = { email, role: "borrower", createdAt: new Date() };
            const result = await usersCollection.insertOne(newUser);
            user = { _id: result.insertedId, ...newUser };
          }
        }

        const token = jwt.sign(
          { id: user._id, email: user.email, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        res
          .cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
          })

          .json({
            success: true,
            token,
            user: { name: user.name, email: user.email, role: user.role },
          });
      } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    /* =======================
        USERS
    ======================= */
    app.post("/users", async (req, res) => {
      try {
        const { email, name, photo, role } = req.body;
        if (!email)
          return res.status(400).json({ message: "Email is required" });

        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) return res.json(existingUser);

        const user = {
          email,
          name: name || "",
          photo: photo || "",
          role: role || "borrower",
          createdAt: new Date(),
        };
        const result = await usersCollection.insertOne(user);
        res.json({ ...user, _id: result.insertedId });
      } catch (err) {
        res.status(500).json({ message: "Internal server error" });
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

    /* =======================
        LOANS
    ======================= */
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

    /* =======================
        MANAGER MY LOANS (NEW) ✅
    ======================= */
    app.get("/manager/my-loans", verifyToken, async (req, res) => {
      try {
        const loans = await loansCollection
          .find()
          .sort({ createdAt: -1 })
          .toArray();
        res.send(loans);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch loans" });
      }
    });

    /* =======================
        LOAN APPLICATIONS
    ======================= */
    app.post("/loan-applications", async (req, res) => {
      const application = req.body;
      application.createdAt = new Date();
      application.status = "Pending";
      application.feeStatus = "Unpaid";
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
      const result = await applicationsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
      );
      res.send(result);
    });

    /* =======================
    MANAGER DELETE LOAN (NEW) ✅
======================= */
    app.delete("/manager/delete-loan/:id", verifyToken, async (req, res) => {
      try {
        const loanId = req.params.id;
        const result = await loansCollection.deleteOne({
          _id: new ObjectId(loanId),
        });
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Loan not found" });
        }
        res.json({ success: true, message: "Loan deleted successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete loan" });
      }
    });

    /* =======================
        ROLE BASED ROUTES & LOCALS
    ======================= */
    app.locals.usersCollection = usersCollection;
    app.locals.loansCollection = loansCollection;
    app.locals.applicationsCollection = applicationsCollection;

    app.use("/admin", adminUsersRoutes);
    app.use("/admin", adminLoansRoutes(db));
    app.use("/manager", managerLoansRoutes(db));

    /* =======================
        Health Check & Static Serve
    ======================= */
    app.get("/", (req, res) => res.send("🚀 LoanLink Server Running"));
    const clientBuildPath = path.join(__dirname, "client/build");
    app.use(express.static(clientBuildPath));
  } catch (error) {
    console.error("MongoDB error:", error);
  }
}

run();

app.listen(port, () => console.log(`✅ Server running on port ${port}`));

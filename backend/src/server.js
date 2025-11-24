require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes");
const featureRoutes = require("./routes/features.routes");
const questionRoutes = require("./routes/questions.routes");
const adminRoutes = require("./routes/admins.routes");
const moduleRoutes = require("./routes/modules.routes");


const app = express();

// ---------------------------------------------------------------------------
// 1. JSON + cookie parser
// ---------------------------------------------------------------------------
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// ---------------------------------------------------------------------------
// 2. CORS (correct, production-grade)
// ---------------------------------------------------------------------------
// IMPORTANT:
// - "origin" must EXACTLY match frontend URL
// - "credentials: true" enables cookies
// - must allow methods + headers explicitly for some browsers
// ---------------------------------------------------------------------------

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,          // http://localhost:5173
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Needed when using cookies + CORS
app.options(/.*/, cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));

// ---------------------------------------------------------------------------
// 3. Health
// ---------------------------------------------------------------------------
app.get("/health", (req, res) => res.json({ ok: true }));

// ---------------------------------------------------------------------------
// 4. Routes
// ---------------------------------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/features", featureRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/modules", moduleRoutes);



// ---------------------------------------------------------------------------
// 5. Start
// ---------------------------------------------------------------------------
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`pc-feature-board running on ${port}`));

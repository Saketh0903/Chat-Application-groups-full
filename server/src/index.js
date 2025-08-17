import express from "express";
import authRoutes from "./routes/auth.route.js";
import dotenv from "dotenv";
import { connectDB } from "./lib/db.js";
import cookieParser from "cookie-parser";
import messageRoutes from "./routes/message.route.js";
import keyRoutes from "./routes/keys.route.js";
import groupRoutes from "./routes/group.route.js";
import cors from "cors";
import { app, server } from "./lib/socket.js";
import path from "path";
import { fileURLToPath } from "url";

// ES modules don’t have __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Middleware
app.use(express.json());
app.use(cookieParser());

// ----------------- CORS -----------------
const rawClientUrls = process.env.CLIENT_URLS || process.env.CLIENT_URL || "";
const allowedOrigins = rawClientUrls.split(",").map(s => s.trim()).filter(Boolean);
const isProduction = process.env.NODE_ENV === "production";

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.length > 0) {
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS policy: origin not allowed"));
    }

    if (isProduction) {
      console.warn("CORS: no CLIENT_URL(S) configured in production — rejecting:", origin);
      return callback(new Error("CORS policy: no CLIENT_URL(S) configured"));
    }

    console.log("CORS: allowing dynamic origin:", origin);
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  exposedHeaders: ["Content-Disposition", "Content-Type", "Content-Length"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ----------------- API ROUTES -----------------
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/keys", keyRoutes);
app.use("/api/groups", groupRoutes);

// ----------------- STATIC FRONTEND -----------------
if (isProduction) {
  const clientDist = path.join(__dirname, "../client/dist");
  app.use(express.static(clientDist));

  // React Router fallback
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ----------------- SERVER -----------------
const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  connectDB();
});

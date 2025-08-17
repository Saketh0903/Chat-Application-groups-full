import express from "express"
import authRoutes from "./routes/auth.route.js"
import dotenv from "dotenv"
import { connectDB } from "./lib/db.js"
import cookieParser from "cookie-parser"
import messageRoutes from "./routes/message.route.js"
import keyRoutes from "./routes/keys.route.js"
import groupRoutes from "./routes/group.route.js"
import cors from "cors"
import {app,server} from "./lib/socket.js"
import path from "path"

dotenv.config()

app.use(express.json())

app.use(cookieParser())

// Configure CORS: support CLIENT_URLS (comma-separated) or CLIENT_URL (single)
const rawClientUrls = process.env.CLIENT_URLS || process.env.CLIENT_URL || '';
const allowedOrigins = rawClientUrls.split(',').map(s => s.trim()).filter(Boolean);
const isProduction = process.env.NODE_ENV === 'production';

/*
 * CORS policy:
 * - If no Origin header (server-to-server, curl) -> allow
 * - If CLIENT_URL(S) configured -> only allow those origins
 * - If CLIENT_URL(S) not configured:
 *     - in production: reject cross-origin browser requests (safer)
 *     - in non-production: allow dynamic origins (convenience for local/testing)
 */
const corsOptions = {
    origin: function(origin, callback) {
        // Allow requests with no origin (like server-to-server or curl)
        if (!origin) return callback(null, true);

        // If allowed origins configured, check list
        if (allowedOrigins.length > 0) {
            if (allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error('CORS policy: origin not allowed'));
        }

        // No allowed origins configured
        if (isProduction) {
            // In production we require explicit CLIENT_URL(S) — deny cross-origin requests
            console.warn('CORS: no CLIENT_URL(S) configured in production — rejecting origin:', origin);
            return callback(new Error('CORS policy: no CLIENT_URL(S) configured'));
        }

        // Non-production: allow dynamic origin but log for auditing
        console.log('CORS: allowing dynamic origin (no CLIENT_URL(S) configured):', origin);
        return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    exposedHeaders: ["Content-Disposition", "Content-Type", "Content-Length"]
};

app.use(cors(corsOptions));
// Preflight support for all routes
app.options('*', cors(corsOptions));

console.log('CORS allowed origins:', allowedOrigins.length ? allowedOrigins : (isProduction ? 'NONE (production - must set CLIENT_URL(S))' : 'dynamic (no CLIENT_URL/CUSTOM configured)'));

const port = process.env.PORT || 5000
const __dirname=path.resolve()

if(process.env.NODE_ENV==="production"){
    // Serve the built client located in ../client/dist
    const clientDist = path.join(__dirname, "../client/dist")
    app.use(express.static(clientDist))

    app.use("*", (req, res) => {
        res.sendFile(path.join(clientDist, "index.html"))
    })
}

app.use("/api/auth",authRoutes)
app.use("/api/messages",messageRoutes)
app.use("/api/keys",keyRoutes)
app.use('/api/groups', groupRoutes)

server.listen(port,()=>{
    console.log(`Server is running on port ${port}`)
    connectDB()
})
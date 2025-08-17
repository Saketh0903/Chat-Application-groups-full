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

const corsOptions = {
    origin: function(origin, callback) {
        // Allow requests with no origin (like server-to-server or curl)
        if (!origin) return callback(null, true);

        // If no allowed origins configured, allow any origin
        if (allowedOrigins.length === 0) return callback(null, true);

        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('CORS policy: origin not allowed'));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    exposedHeaders: ["Content-Disposition", "Content-Type", "Content-Length"]
};

app.use(cors(corsOptions));
// Preflight support for all routes
app.options('*', cors(corsOptions));

console.log('CORS allowed origins:', allowedOrigins.length ? allowedOrigins : 'all (no CLIENT_URL/CUSTOM configured)');

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
import express from "express";
import multer from "multer";
import { protectRoute } from "../middleware/auth.middleware.js";
import { downloadFile, getMessages, getUsersForSidebar, sendMessage, uploadFile } from "../controllers/message.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // explicit memory storage

router.get("/users", protectRoute, getUsersForSidebar);

// Upload endpoint used by client uploadFile
router.post('/upload', protectRoute, upload.single('file'), uploadFile);
router.get('/download', protectRoute, downloadFile);

// Send message (specific) must come before the param route
router.post("/send/:id", protectRoute, sendMessage);

// Get messages for a user or group by id (param route)
router.get("/:id", protectRoute, getMessages);

export default router;
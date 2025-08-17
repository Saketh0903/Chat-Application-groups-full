import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { upsertPublicKey, getPublicKey } from "../controllers/keys.controller.js";

const router = express.Router();

router.put("/", protectRoute, upsertPublicKey);
router.get("/:id", protectRoute, getPublicKey);

export default router;

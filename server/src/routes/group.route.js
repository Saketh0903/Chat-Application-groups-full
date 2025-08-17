import express from 'express';
import { createGroup, getMyGroups, joinGroup, leaveGroup } from '../controllers/group.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';
import User from '../models/user.model.js';

const router = express.Router();

router.post("/", protectRoute, createGroup);
router.get("/all-users", async (req, res) => {
	try {
		const users = await User.find({}, '-password'); // Exclude password field
		res.json(users);
	} catch (err) {
		res.status(500).json({ message: 'Failed to fetch users' });
	}
});
router.get("/my", protectRoute, getMyGroups);
router.post("/join/:groupId", protectRoute, joinGroup);
router.post("/leave/:groupId", protectRoute, leaveGroup);

export default router;

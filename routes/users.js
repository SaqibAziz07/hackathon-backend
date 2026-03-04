import express from "express";
import User from "../models/User.js";
import authMiddleware from "../middleware/auth.js";
import { isAdmin } from "../middleware/roles.js";

const router = express.Router();

// Get all doctors
router.get("/doctors", authMiddleware, async (req, res, next) => {
  try {
    const doctors = await User.find({ role: "doctor" })
      .select("name email specialization phone profileImage")
      .sort({ name: 1 });

    res.json({
      success: true,
      count: doctors.length,
      doctors
    });
  } catch (error) {
    next(error);
  }
});

// Get all receptionists (admin only)
router.get("/receptionists", authMiddleware, isAdmin, async (req, res, next) => {
  try {
    const receptionists = await User.find({ role: "receptionist" })
      .select("name email phone profileImage")
      .sort({ name: 1 });

    res.json({
      success: true,
      count: receptionists.length,
      receptionists
    });
  } catch (error) {
    next(error);
  }
});

// Get single user by ID
router.get("/:id", authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password");

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
});

export default router;
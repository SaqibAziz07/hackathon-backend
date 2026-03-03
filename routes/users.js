import express from "express";
import User from "../models/User.js";
import authMiddleware from "../middleware/auth.js";
import { isAdmin } from "../middleware/roles.js";

const router = express.Router();

// @desc    Get all doctors
// @route   GET /api/users/doctors
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

// @desc    Get all receptionists (admin only)
// @route   GET /api/users/receptionists
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

// @desc    Get single user by ID
// @route   GET /api/users/:id
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
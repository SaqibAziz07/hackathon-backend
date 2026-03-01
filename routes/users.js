import express from "express";
import User from "../models/User.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// @desc    Get all doctors
// @route   GET /api/users/doctors
router.get("/doctors", authMiddleware, async (req, res) => {
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
    console.error("Get doctors error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Get all receptionists (admin only)
// @route   GET /api/users/receptionists
router.get("/receptionists", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Admin only." 
      });
    }

    const receptionists = await User.find({ role: "receptionist" })
      .select("name email phone profileImage")
      .sort({ name: 1 });

    res.json({
      success: true,
      count: receptionists.length,
      receptionists
    });
  } catch (error) {
    console.error("Get receptionists error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Get single user by ID
// @route   GET /api/users/:id
router.get("/:id", authMiddleware, async (req, res) => {
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
    console.error("Get user error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

export default router;
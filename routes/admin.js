import express from "express";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import Settings from "../models/Settings.js";
import authMiddleware from "../middleware/auth.js";
import { isAdmin } from "../middleware/roles.js";

const router = express.Router();

// Admin only for all routes
router.use(authMiddleware, isAdmin);

// Get all users with filters
router.get("/users", async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    let query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query).select("-password").sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
});

// Update user role or status (Approve/Block)
router.put("/users/:id", async (req, res, next) => {
  try {
    const { role, status } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (role) user.role = role;
    if (status) user.status = status;

    await user.save();

    // Log the action
    await AuditLog.create({
      userId: req.user.userId,
      action: `UPDATE_USER_${user._id}`,
      module: 'ADMIN',
      details: { updatedFields: { role, status }, targetUser: user.email }
    });

    res.json({
      success: true,
      message: "User updated successfully",
      user
    });
  } catch (error) {
    next(error);
  }
});

// Get audit logs
router.get("/audit-logs", async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate('userId', 'name role email')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    next(error);
  }
});

// Get system settings
router.get("/settings", async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json({ success: true, settings });
  } catch (error) {
    next(error);
  }
});

// Update system settings
router.put("/settings", async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    settings.updatedBy = req.user.userId;
    await settings.save();

    await AuditLog.create({
      userId: req.user.userId,
      action: 'UPDATE_SYSTEM_SETTINGS',
      module: 'ADMIN',
      details: req.body
    });

    res.json({ success: true, message: "Settings updated successfully", settings });
  } catch (error) {
    next(error);
  }
});

export default router;
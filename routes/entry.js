import express from "express";
import Entry from "../models/Entry.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Get all entries for a user
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const entries = await Entry.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });
    res.json({
      success: true,
      count: entries.length,
      entries
    });
  } catch (err) {
    next(err);
  }
});

// Create a new entry
router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const entry = new Entry({
      ...req.body,
      userId: req.user.userId
    });
    await entry.save();
    res.status(201).json({
      success: true,
      entry
    });
  } catch (err) {
    next(err);
  }
});

// Delete an entry
router.delete("/:id", authMiddleware, async (req, res, next) => {
  try {
    const entry = await Entry.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found or unauthorized"
      });
    }

    res.json({ 
      success: true,
      message: "Deleted" 
    });
  } catch (err) {
    next(err);
  }
});

export default router;
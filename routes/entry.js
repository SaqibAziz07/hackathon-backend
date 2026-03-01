import express from "express";
import Entry from "../models/Entry.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// 🔐 All routes protected
router.get("/", authMiddleware, async (req, res) => {
  try {
    const entries = await Entry.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const entry = new Entry({
      ...req.body,
      userId: req.user.userId
    });
    await entry.save();
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await Entry.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
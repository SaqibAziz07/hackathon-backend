import express from "express";
import User from "../models/User.js";
import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import Prescription from "../models/Prescription.js";
import DiagnosisLog from "../models/DiagnosisLog.js";
import authMiddleware from "../middleware/auth.js";
import { isAdmin, isDoctor } from "../middleware/roles.js";

const router = express.Router();

// @desc    Admin Analytics Dashboard
// @route   GET /api/analytics/admin
router.get("/admin", authMiddleware, isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalPatients,
      totalDoctors,
      monthlyAppointments,
      proUsers,
      recentAppointments
    ] = await Promise.all([
      Patient.countDocuments(),
      User.countDocuments({ role: "doctor" }),
      Appointment.countDocuments({ date: { $gte: firstDayOfMonth } }),
      User.countDocuments({ subscriptionPlan: "pro" }),
      Appointment.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("patientId", "name")
        .populate("doctorId", "name")
    ]);

    // Simulated Revenue (e.g. $99 per Pro user)
    const simulatedRevenue = proUsers * 99;

    res.json({
      success: true,
      data: {
        totalPatients,
        totalDoctors,
        monthlyAppointments,
        proUsers,
        simulatedRevenue,
        recentAppointments
      }
    });
  } catch (error) {
    console.error("Admin Analytics Error:", error);
    res.status(500).json({ success: false, message: "Server error checking analytics" });
  }
});

// @desc    Doctor Analytics Dashboard
// @route   GET /api/analytics/doctor
router.get("/doctor", authMiddleware, isDoctor, async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const now = new Date();
    
    // Start of today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      dailyAppointments,
      monthlyAppointments,
      prescriptionCount,
      aiDiagnosisCount
    ] = await Promise.all([
      Appointment.countDocuments({ doctorId, date: { $gte: startOfToday } }),
      Appointment.countDocuments({ doctorId, date: { $gte: startOfMonth } }),
      Prescription.countDocuments({ doctorId }),
      DiagnosisLog.countDocuments({ doctorId })
    ]);

    res.json({
      success: true,
      data: {
        dailyAppointments,
        monthlyAppointments,
        prescriptionCount,
        aiDiagnosisCount
      }
    });

  } catch (error) {
    console.error("Doctor Analytics Error:", error);
    res.status(500).json({ success: false, message: "Server error checking analytics" });
  }
});

export default router;

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
router.get("/admin", authMiddleware, isAdmin, async (req, res, next) => {
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

    // Aggregations for more detailed reports
    const [
      registrationTrends,
      topDoctors,
      peakHours
    ] = await Promise.all([
      // Patient registration trends (last 6 months)
      Patient.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$registrationDate" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id": -1 } },
        { $limit: 6 }
      ]),
      // Most booked doctors
      Appointment.aggregate([
        { $group: { _id: "$doctorId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "doctorInfo"
          }
        },
        { $unwind: "$doctorInfo" },
        {
          $project: {
            name: "$doctorInfo.name",
            specialization: "$doctorInfo.specialization",
            count: 1
          }
        }
      ]),
      // Peak appointment hours
      Appointment.aggregate([
        { $group: { _id: "$timeSlot", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalPatients,
        totalDoctors,
        monthlyAppointments,
        proUsers,
        simulatedRevenue,
        recentAppointments,
        registrationTrends,
        topDoctors,
        peakHours
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Doctor Analytics Dashboard
// @route   GET /api/analytics/doctor
router.get("/doctor", authMiddleware, isDoctor, async (req, res, next) => {
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
    next(error);
  }
});

export default router;

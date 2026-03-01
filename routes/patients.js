import express from "express";
import Patient from "../models/Patient.js";
import authMiddleware from "../middleware/auth.js";
import { isAdmin, isReceptionist, isDoctor } from "../middleware/roles.js";

const router = express.Router();

// @desc    Create new patient (Admin/Receptionist only)
// @route   POST /api/patients
router.post("/", authMiddleware, async (req, res) => {
  try {
    // Check if user has permission
    if (!['admin', 'receptionist'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: "Only admin and receptionist can create patients" 
      });
    }

    const patientData = {
      ...req.body,
      createdBy: req.user.userId
    };

    const patient = new Patient(patientData);
    await patient.save();

    res.status(201).json({
      success: true,
      message: "Patient created successfully",
      patient
    });
  } catch (error) {
    console.error("Create patient error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Get all patients
// @route   GET /api/patients
router.get("/", authMiddleware, async (req, res) => {
  try {
    let patients;
    
    // Different roles see different data
    if (req.user.role === 'patient') {
      // Patients see only themselves
      patients = await Patient.find({ _id: req.user.userId });
    } else {
      // Admin, doctor, receptionist see all
      patients = await Patient.find()
        .populate('createdBy', 'name email');
    }

    res.json({
      success: true,
      count: patients.length,
      patients
    });
  } catch (error) {
    console.error("Get patients error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Get single patient
// @route   GET /api/patients/:id
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: "Patient not found" 
      });
    }

    // Check if patient has access to this patient
    if (req.user.role === 'patient' && patient._id.toString() !== req.user.userId) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied" 
      });
    }

    res.json({
      success: true,
      patient
    });
  } catch (error) {
    console.error("Get patient error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Update patient
// @route   PUT /api/patients/:id
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    // Check permissions
    if (!['admin', 'receptionist'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied" 
      });
    }

    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: "Patient not found" 
      });
    }

    res.json({
      success: true,
      message: "Patient updated successfully",
      patient
    });
  } catch (error) {
    console.error("Update patient error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Delete patient
// @route   DELETE /api/patients/:id
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    // Only admin can delete
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Only admin can delete patients" 
      });
    }

    const patient = await Patient.findByIdAndDelete(req.params.id);

    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: "Patient not found" 
      });
    }

    res.json({
      success: true,
      message: "Patient deleted successfully"
    });
  } catch (error) {
    console.error("Delete patient error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Get patient medical history
// @route   GET /api/patients/:id/history
router.get("/:id/history", authMiddleware, async (req, res) => {
  try {
    const patientId = req.params.id;
    
    // Get appointments
    const Appointment = mongoose.model('Appointment');
    const Prescription = mongoose.model('Prescription');
    const DiagnosisLog = mongoose.model('DiagnosisLog');

    const [appointments, prescriptions, diagnoses] = await Promise.all([
      Appointment.find({ patientId })
        .populate('doctorId', 'name specialization')
        .sort({ date: -1 }),
      Prescription.find({ patientId })
        .populate('doctorId', 'name')
        .sort({ createdAt: -1 }),
      DiagnosisLog.find({ patientId })
        .populate('doctorId', 'name')
        .sort({ createdAt: -1 })
    ]);

    res.json({
      success: true,
      history: {
        appointments,
        prescriptions,
        diagnoses
      }
    });
  } catch (error) {
    console.error("Get patient history error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

export default router;
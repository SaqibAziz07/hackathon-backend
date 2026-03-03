import express from "express";
import Patient from "../models/Patient.js";
import authMiddleware from "../middleware/auth.js";
import { isAdmin, isReceptionist, isDoctor } from "../middleware/roles.js";

const router = express.Router();

// @desc    Create new patient (Admin/Receptionist only)
// @route   POST /api/patients
router.post("/", authMiddleware, (req, res, next) => {
  if (!['admin', 'receptionist'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Only admin and receptionist can create patients" });
  }
  next();
}, async (req, res, next) => {
  try {
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
    next(error);
  }
});

// @desc    Get all patients / Search patients
// @route   GET /api/patients
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { search, mrNumber, phone } = req.query;

    let query = {};
    
    // Role-based restrictions
    if (req.user.role === 'patient') {
      query = { _id: req.user.userId };
    } else {
      // Search filters
      if (search) {
        query.name = { $regex: search, $options: 'i' };
      }
      if (mrNumber) {
        query.mrNumber = mrNumber;
      }
      if (phone) {
        query.contact = phone;
      }
    }

    const [patients, total] = await Promise.all([
      Patient.find(query)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Patient.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: patients.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      patients
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single patient
// @route   GET /api/patients/:id
router.get("/:id", authMiddleware, async (req, res, next) => {
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
    next(error);
  }
});

// @desc    Update patient
// @route   PUT /api/patients/:id
router.put("/:id", authMiddleware, async (req, res, next) => {
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
    next(error);
  }
});

// @desc    Delete patient
// @route   DELETE /api/patients/:id
router.delete("/:id", authMiddleware, isAdmin, async (req, res, next) => {
  try {
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
    next(error);
  }
});

// @desc    Get patient medical history
// @route   GET /api/patients/:id/history
router.get("/:id/history", authMiddleware, async (req, res, next) => {
  try {
    const patientId = req.params.id;
    
    // Get models directly if not imported (Mongoose 6+)
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
    next(error);
  }
});

// @desc    Search patients by MR#, Name, or Phone (Receptionist/Doctor)
// @route   GET /api/patients/search/quick
router.get("/search/quick", authMiddleware, async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ success: false, message: "Search query is required" });
    }

    const patients = await Patient.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { mrNumber: { $regex: query, $options: 'i' } },
        { contact: { $regex: query, $options: 'i' } }
      ]
    }).limit(10);

    res.json({
      success: true,
      count: patients.length,
      patients
    });
  } catch (error) {
    next(error);
  }
});

export default router;
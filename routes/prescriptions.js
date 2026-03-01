import express from "express";
import Prescription from "../models/Prescription.js";
import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import authMiddleware from "../middleware/auth.js";
import { generatePrescriptionPDF } from "../utils/pdfGenerator.js";

const router = express.Router();

// @desc    Create prescription (Doctor only)
// @route   POST /api/prescriptions
router.post("/", authMiddleware, async (req, res) => {
  try {
    // Only doctors can create prescriptions
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: "Only doctors can create prescriptions"
      });
    }

    const { patientId, appointmentId, diagnosis, symptoms, medicines, tests, advice, followUpDate } = req.body;

    // Validation
    if (!patientId || !diagnosis || !symptoms) {
      return res.status(400).json({
        success: false,
        message: "Patient, diagnosis and symptoms are required"
      });
    }

    // Check if patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

    // If appointmentId provided, check if it exists and belongs to this doctor
    if (appointmentId) {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found"
        });
      }
      
      if (appointment.doctorId.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: "This appointment is not assigned to you"
        });
      }

      // Update appointment status to completed
      appointment.status = 'completed';
      await appointment.save();
    }

    // Create prescription
    const prescriptionData = {
      patientId,
      doctorId: req.user.userId,
      appointmentId,
      diagnosis,
      symptoms,
      medicines: medicines || [],
      tests: tests || [],
      advice: advice || '',
      followUpDate
    };

    const prescription = new Prescription(prescriptionData);
    await prescription.save();

    // Populate data for PDF generation
    const populatedPrescription = await Prescription.findById(prescription._id)
      .populate('patientId', 'name age gender contact')
      .populate('doctorId', 'name specialization');

    // Generate PDF
    try {
      const pdfUrl = await generatePrescriptionPDF(populatedPrescription);
      prescription.pdfUrl = pdfUrl;
      await prescription.save();
      populatedPrescription.pdfUrl = pdfUrl;
    } catch (pdfError) {
      console.error("PDF Generation error:", pdfError);
      // We continue even if PDF fails, as the record is saved
    }

    res.status(201).json({
      success: true,
      message: "Prescription created successfully",
      prescription: populatedPrescription
    });

  } catch (error) {
    console.error("Create prescription error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get all prescriptions (role-based)
// @route   GET /api/prescriptions
router.get("/", authMiddleware, async (req, res) => {
  try {
    let query = {};
    
    // Role-based filtering
    if (req.user.role === 'doctor') {
      query.doctorId = req.user.userId;
    } else if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ email: req.user.email });
      if (patient) {
        query.patientId = patient._id;
      }
    }
    // Admin sees all

    const prescriptions = await Prescription.find(query)
      .populate('patientId', 'name age gender contact')
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: prescriptions.length,
      prescriptions
    });

  } catch (error) {
    console.error("Get prescriptions error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get single prescription
// @route   GET /api/prescriptions/:id
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patientId', 'name age gender contact email')
      .populate('doctorId', 'name specialization email phone')
      .populate('appointmentId');

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found"
      });
    }

    res.json({
      success: true,
      prescription
    });

  } catch (error) {
    console.error("Get prescription error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Update prescription (Doctor only)
// @route   PUT /api/prescriptions/:id
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: "Only doctors can update prescriptions"
      });
    }

    const prescription = await Prescription.findById(req.params.id);
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found"
      });
    }

    // Check if this prescription belongs to the doctor
    if (prescription.doctorId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own prescriptions"
      });
    }

    const updatedPrescription = await Prescription.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('patientId', 'name age gender contact')
     .populate('doctorId', 'name specialization');

    res.json({
      success: true,
      message: "Prescription updated successfully",
      prescription: updatedPrescription
    });

  } catch (error) {
    console.error("Update prescription error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Delete prescription (Doctor/Admin only)
// @route   DELETE /api/prescriptions/:id
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (!['doctor', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const prescription = await Prescription.findById(req.params.id);
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found"
      });
    }

    // Doctors can only delete their own prescriptions
    if (req.user.role === 'doctor' && prescription.doctorId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own prescriptions"
      });
    }

    await Prescription.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Prescription deleted successfully"
    });

  } catch (error) {
    console.error("Delete prescription error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get patient's prescription history
// @route   GET /api/prescriptions/patient/:patientId
router.get("/patient/:patientId", authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Check access
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ email: req.user.email });
      if (!patient || patient._id.toString() !== patientId) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }
    }

    const prescriptions = await Prescription.find({ patientId })
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: prescriptions.length,
      prescriptions
    });

  } catch (error) {
    console.error("Get patient prescriptions error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
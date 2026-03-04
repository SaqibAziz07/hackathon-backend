import express from "express";
import { z } from "zod";
import Prescription from "../models/Prescription.js";
import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import authMiddleware from "../middleware/auth.js";
import { generatePrescriptionPDF } from "../utils/pdfGenerator.js";
import { isDoctor } from "../middleware/roles.js";

const router = express.Router();

// Zod schema for prescription
const prescriptionSchema = z.object({
  patientId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  appointmentId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  diagnosis: z.string().min(3),
  symptoms: z.string().min(5),
  medicines: z.array(z.object({
    name: z.string().min(2),
    dosage: z.string().min(1),
    form: z.enum(['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Other']).optional(),
    frequency: z.string().min(3),
    duration: z.string().min(2),
    instructions: z.string().optional(),
    beforeFood: z.boolean().optional(),
  })).optional(),
  tests: z.array(z.object({
    name: z.string().min(2),
    instructions: z.string().optional(),
  })).optional(),
  advice: z.string().optional(),
  followUpDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }).optional(),
});

// Create prescription (Doctor only)
router.post("/", authMiddleware, isDoctor, async (req, res, next) => {
  try {
    const validated = prescriptionSchema.parse(req.body);
    const { patientId, appointmentId, diagnosis, symptoms, medicines, tests, advice, followUpDate } = validated;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

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

      appointment.status = 'completed';
      await appointment.save();
    }

    const prescriptionData = {
      patientId,
      doctorId: req.user.userId,
      appointmentId,
      diagnosis,
      symptoms,
      medicines: medicines || [],
      tests: tests || [],
      advice: advice || '',
      followUpDate: followUpDate ? new Date(followUpDate) : undefined
    };

    const prescription = new Prescription(prescriptionData);
    await prescription.save();

    const populatedPrescription = await Prescription.findById(prescription._id)
      .populate('patientId', 'name age gender contact')
      .populate('doctorId', 'name specialization');

    try {
      const pdfUrl = await generatePrescriptionPDF(populatedPrescription);
      prescription.pdfUrl = pdfUrl;
      await prescription.save();
      populatedPrescription.pdfUrl = pdfUrl;
    } catch (pdfError) {
      console.error("PDF Generation error:", pdfError);
    }

    res.status(201).json({
      success: true,
      message: "Prescription created successfully",
      prescription: populatedPrescription
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: error.errors });
    }
    next(error);
  }
});

// Get all prescriptions (role-based with pagination)
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (req.user.role === 'doctor') {
      query.doctorId = req.user.userId;
    } else if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ email: req.user.email });
      if (patient) {
        query.patientId = patient._id;
      } else {
        return res.json({ success: true, count: 0, total: 0, page, pages: 0, prescriptions: [] });
      }
    }

    const [prescriptions, total] = await Promise.all([
      Prescription.find(query)
        .populate('patientId', 'name age gender contact')
        .populate('doctorId', 'name specialization')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Prescription.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: prescriptions.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      prescriptions
    });

  } catch (error) {
    next(error);
  }
});

// Get patient's prescription history — MUST be before /:id to avoid being swallowed by it
router.get("/patient/:patientId", authMiddleware, async (req, res, next) => {
  try {
    const { patientId } = req.params;

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
    next(error);
  }
});

// Get single prescription
router.get("/:id", authMiddleware, async (req, res, next) => {
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
    next(error);
  }
});

// Update prescription (Doctor only)
router.put("/:id", authMiddleware, isDoctor, async (req, res, next) => {
  try {
    const validated = prescriptionSchema.parse(req.body);

    const prescription = await Prescription.findById(req.params.id);
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found"
      });
    }

    if (prescription.doctorId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own prescriptions"
      });
    }

    const updatedPrescription = await Prescription.findByIdAndUpdate(
      req.params.id,
      validated,
      { new: true, runValidators: true }
    ).populate('patientId', 'name age gender contact')
     .populate('doctorId', 'name specialization');

    res.json({
      success: true,
      message: "Prescription updated successfully",
      prescription: updatedPrescription
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: error.errors });
    }
    next(error);
  }
});

// Delete prescription (Doctor/Admin only)
router.delete("/:id", authMiddleware, async (req, res, next) => {
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
    next(error);
  }
});

export default router;
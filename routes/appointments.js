import express from "express";
import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import User from "../models/User.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// @desc    Create new appointment (Receptionist/Admin/Patient)
// @route   POST /api/appointments
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { patientId, doctorId, date, timeSlot, symptoms } = req.body;

    let finalPatientId = patientId;

    // If patient is booking for themselves, resolve their patient document
    if (req.user.role === 'patient') {
      const patientUser = await User.findById(req.user.userId);
      if (patientUser?.role !== 'patient') {
        return res.status(403).json({ success: false, message: "Invalid patient access" });
      }
      
      let patientDoc = await Patient.findOne({ email: patientUser.email });
      if (!patientDoc) {
        // Automatically create a base patient profile if missing
        patientDoc = await Patient.create({
          name: patientUser.name,
          email: patientUser.email,
          contact: patientUser.phone || "0000000000",
          age: 30, // Default placeholders
          gender: 'Other',
          createdBy: patientUser._id
        });
      }
      finalPatientId = patientDoc._id;
    }

    // Check if patient exists (for admin/receptionist)
    const patient = await Patient.findById(finalPatientId);
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: "Patient not found" 
      });
    }

    // Check if doctor exists and is actually a doctor
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({ 
        success: false, 
        message: "Doctor not found" 
      });
    }

    // Check if slot is available
    const existingAppointment = await Appointment.findOne({
      doctorId,
      date,
      timeSlot,
      status: { $ne: 'cancelled' }
    });

    if (existingAppointment) {
      return res.status(400).json({ 
        success: false, 
        message: "This time slot is already booked" 
      });
    }

    const appointmentData = {
      patientId: finalPatientId,
      doctorId,
      date,
      timeSlot,
      symptoms,
      createdBy: req.user.userId
    };

    const appointment = new Appointment(appointmentData);
    await appointment.save();

    // Populate data for response
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', 'name age gender contact')
      .populate('doctorId', 'name specialization')
      .populate('createdBy', 'name role');

    res.status(201).json({
      success: true,
      message: "Appointment created successfully",
      appointment: populatedAppointment
    });

  } catch (error) {
    console.error("Create appointment error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Get all appointments (with filters)
// @route   GET /api/appointments
router.get("/", authMiddleware, async (req, res) => {
  try {
    let query = {};
    const { status, doctorId, patientId, date } = req.query;

    // Role-based filtering
    if (req.user.role === 'doctor') {
      // Doctors see only their appointments
      query.doctorId = req.user.userId;
    } else if (req.user.role === 'patient') {
      // Patients see only their appointments
      const patientUser = await User.findById(req.user.userId);
      if (patientUser?.role === 'patient') {
        // Find patient record for this user
        const patient = await Patient.findOne({ email: patientUser.email });
        if (patient) {
          query.patientId = patient._id;
        }
      }
    }
    // Admin and receptionist see all (no filter)

    // Apply query filters
    if (status) query.status = status;
    if (doctorId) query.doctorId = doctorId;
    if (patientId) query.patientId = patientId;
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'name age gender contact')
      .populate('doctorId', 'name specialization')
      .populate('createdBy', 'name role')
      .sort({ date: -1, timeSlot: 1 });

    res.json({
      success: true,
      count: appointments.length,
      appointments
    });

  } catch (error) {
    console.error("Get appointments error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Get single appointment
// @route   GET /api/appointments/:id
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patientId', 'name age gender contact email address')
      .populate('doctorId', 'name specialization phone email')
      .populate('createdBy', 'name role');

    if (!appointment) {
      return res.status(404).json({ 
        success: false, 
        message: "Appointment not found" 
      });
    }

    // Check access rights
    if (req.user.role === 'doctor' && appointment.doctorId._id.toString() !== req.user.userId) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. This is not your appointment." 
      });
    }

    if (req.user.role === 'patient') {
      const patientUser = await User.findById(req.user.userId);
      const patient = await Patient.findOne({ email: patientUser.email });
      if (appointment.patientId._id.toString() !== patient?._id.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied. This is not your appointment." 
        });
      }
    }

    res.json({
      success: true,
      appointment
    });

  } catch (error) {
    console.error("Get appointment error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Update appointment status
// @route   PUT /api/appointments/:id/status
router.put("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid status" 
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ 
        success: false, 
        message: "Appointment not found" 
      });
    }

    // Check permissions
    if (req.user.role === 'doctor') {
      // Doctors can only update their own appointments
      if (appointment.doctorId.toString() !== req.user.userId) {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied" 
        });
      }
      // Doctors can only mark as confirmed/completed
      if (!['confirmed', 'completed'].includes(status)) {
        return res.status(403).json({ 
          success: false, 
          message: "Doctors can only confirm or complete appointments" 
        });
      }
    } else if (req.user.role === 'patient') {
      // Patients can only cancel their appointments
      const patientUser = await User.findById(req.user.userId);
      const patient = await Patient.findOne({ email: patientUser.email });
      if (appointment.patientId.toString() !== patient?._id.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied" 
        });
      }
      if (status !== 'cancelled') {
        return res.status(403).json({ 
          success: false, 
          message: "Patients can only cancel appointments" 
        });
      }
    }
    // Admin and receptionist can update any status

    appointment.status = status;
    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', 'name age gender contact')
      .populate('doctorId', 'name specialization');

    res.json({
      success: true,
      message: `Appointment ${status}`,
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error("Update appointment status error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Get available time slots for a doctor on a date
// @route   GET /api/appointments/available-slots
router.get("/available-slots/:doctorId/:date", authMiddleware, async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    
    // All possible time slots (30 min intervals)
    const allSlots = [
      "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
      "12:00 PM", "12:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
      "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM"
    ];

    // Get booked slots
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const bookedAppointments = await Appointment.find({
      doctorId,
      date: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' }
    }).select('timeSlot');

    const bookedSlots = bookedAppointments.map(apt => apt.timeSlot);

    // Filter available slots
    const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));

    res.json({
      success: true,
      date,
      availableSlots,
      bookedSlots
    });

  } catch (error) {
    console.error("Get available slots error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Get doctor's schedule
// @route   GET /api/appointments/doctor/schedule
router.get("/doctor/schedule", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Doctors only." 
      });
    }

    const { startDate, endDate } = req.query;
    
    let query = { doctorId: req.user.userId };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'name age gender contact')
      .sort({ date: 1, timeSlot: 1 });

    // Group by date
    const schedule = appointments.reduce((acc, apt) => {
      const dateStr = apt.date.toISOString().split('T')[0];
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(apt);
      return acc;
    }, {});

    res.json({
      success: true,
      schedule
    });

  } catch (error) {
    console.error("Get doctor schedule error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @desc    Get patient's appointment history
// @route   GET /api/appointments/patient/history
router.get("/patient/history", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Patients only." 
      });
    }

    // Find patient record for this user
    const patientUser = await User.findById(req.user.userId);
    const patient = await Patient.findOne({ email: patientUser.email });

    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: "Patient record not found" 
      });
    }

    const appointments = await Appointment.find({ patientId: patient._id })
      .populate('doctorId', 'name specialization')
      .sort({ date: -1, timeSlot: -1 });

    res.json({
      success: true,
      count: appointments.length,
      appointments
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
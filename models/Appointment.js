import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  timeSlot: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'checked-in', 'in-consultation', 'completed', 'cancelled'],
    default: 'pending'
  },
  appointmentType: {
    type: String,
    enum: ['new', 'follow-up', 'emergency', 'lab-test'],
    default: 'new'
  },
  checkedInTime: Date,
  consultationStartTime: Date,
  consultationEndTime: Date,
  cancellationReason: String,
  waitingNumber: Number,
  symptoms: String,
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Appointment = mongoose.models.Appointment || mongoose.model("Appointment", appointmentSchema);
export default Appointment;
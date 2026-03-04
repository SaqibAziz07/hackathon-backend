import mongoose from "mongoose";

// Medicine sub-schema
const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  dosage: {
    type: String,
    required: true,
  },
  form: {
    type: String,
    enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Other'],
    default: 'Tablet'
  },
  frequency: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  instructions: {
    type: String,
    default: ''
  },
  beforeFood: {
    type: Boolean,
    default: true
  }
});

// Test sub-schema
const testSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  instructions: String
});

// Main Prescription Schema
const prescriptionSchema = new mongoose.Schema({
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
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  diagnosis: {
    type: String,
    required: true
  },
  symptoms: {
    type: String,
    required: true
  },
  medicines: [medicineSchema],
  tests: [testSchema],
  aiSummary: String,
  advice: {
    type: String,
    default: ''
  },
  followUpDate: {
    type: Date
  },
  aiExplanation: {
    type: String,
    default: ''
  },
  isAIGenerated: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  pdfUrl: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add indexes
prescriptionSchema.index({ patientId: 1, createdAt: -1 });
prescriptionSchema.index({ doctorId: 1 });

const Prescription = mongoose.models.Prescription || mongoose.model("Prescription", prescriptionSchema);
export default Prescription;
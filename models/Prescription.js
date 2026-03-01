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
    enum: ['5mg', '10mg', '20mg', '50mg', '100mg', '250mg', '500mg', '1g', 'Other']
  },
  form: {
    type: String,
    enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops'],
    default: 'Tablet'
  },
  frequency: {
    type: String,
    required: true,
    enum: ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'As needed']
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

const Prescription = mongoose.models.Prescription || mongoose.model("Prescription", prescriptionSchema);
export default Prescription;
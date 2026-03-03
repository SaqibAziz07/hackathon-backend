import mongoose from "mongoose";

const patientSchema = new mongoose.Schema({
  mrNumber: {
    type: String,
    unique: true,
    sparse: true // Allows multiple nulls if not generated yet
  },
  name: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  contact: {
    type: String,
    required: true
  },
  email: String,
  address: String,
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
  },
  emergencyContact: String,
  insuranceProvider: String,
  insuranceNumber: String,
  allergies: [String],
  medicalHistory: String,
  familyHistory: String,
  registrationDate: {
    type: Date,
    default: Date.now
  },
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

// Generate MR Number before saving
patientSchema.pre('save', async function(next) {
  if (!this.mrNumber) {
    // Basic MR number generation: MR-TIMESTAMP-RANDOM
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.mrNumber = `MR-${timestamp}${random}`;
  }
  next();
});

const Patient = mongoose.models.Patient || mongoose.model("Patient", patientSchema);
export default Patient;
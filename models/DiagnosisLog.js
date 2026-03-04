import mongoose from "mongoose";

const diagnosisLogSchema = new mongoose.Schema({
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
  symptoms: {
    type: String,
    required: true
  },
  age: Number,
  gender: String,
  medicalHistory: String,
  aiResponse: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high']
  },
  aiConfidence: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes
diagnosisLogSchema.index({ patientId: 1, createdAt: -1 });
diagnosisLogSchema.index({ doctorId: 1 });

const DiagnosisLog = mongoose.models.DiagnosisLog || mongoose.model("DiagnosisLog", diagnosisLogSchema);
export default DiagnosisLog;
import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  departments: [{
    name: String,
    isActive: { type: Boolean, default: true }
  }],
  consultationFees: {
    general: { type: Number, default: 500 },
    specialist: { type: Number, default: 1000 },
    emergency: { type: Number, default: 1500 }
  },
  appointmentSlots: {
    duration: { type: Number, default: 30 }, // in minutes
    startTime: { type: String, default: "09:00" },
    endTime: { type: String, default: "18:00" },
    breakStart: String,
    breakEnd: String
  },
  smsTemplates: {
    appointmentConfirmation: String,
    followUpReminder: String
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Add index if needed
settingsSchema.index({ updatedAt: -1 });

const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);
export default Settings;
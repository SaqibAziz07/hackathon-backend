import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'doctor', 'receptionist', 'patient'],
    required: true
  },
  specialization: {
    type: String,
    required: function() { return this.role === 'doctor'; }
  },
  phone: {
    type: String,
    required: true
  },
  subscriptionPlan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free'
  },
  profileImage: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ✅ Async pre-save hook for Mongoose 9+
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }

  // Hash password asynchronously
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ✅ Compare password method (async version)
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ✅ Export with safe model creation
const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
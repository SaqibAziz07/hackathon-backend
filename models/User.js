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
    // enum: ['admin', 'doctor', 'receptionist', 'patient', 'super-admin', 'manager'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'blocked', 'pending_approval', 'pending_otp', 'rejected'],
    default: 'active'
  },
  specialization: {
    type: String,
    required: function() { return this.role === 'doctor'; }
  },
  // phone: {
  //   type: String,
  //   required: false,
  //   default: ''
  // },
  subscriptionPlan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free'
  },
  profileImage: {
    type: String,
    default: ''
  },
  // ── OTP fields ──
  otp: {
    type: String,
    select: false
  },
  otpExpiry: {
    type: Date,
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ status: 1 });   // ← NEW: approval queries fast honge

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
// ```

// ---

// **Summary — kya change hua:**
// - `status` → 5 values: `active`, `blocked`, `pending_approval`, `pending_otp`, `rejected` ✅
// - `phone` → optional ✅
// - `otp` + `otpExpiry` → added, hidden by default ✅
// - `status` index → approval queries fast ✅

// ---

// **Poora signup flow ab complete hai! 🎉**
// ```
// Doctor signup kare
//       ↓
// status: "pending_approval" — Admin ko email
//       ↓
// Admin dashboard mein approve kare → POST /admin/approve/:id
//       ↓
// status: "pending_otp" — User ko OTP email
//       ↓
// User OTP enter kare → POST /verify-otp
//       ↓
// status: "active" — Login allowed ✅
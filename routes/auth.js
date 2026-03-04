// server/routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { z } from "zod";
import User from "../models/User.js";
import authMiddleware from "../middleware/auth.js";
import { sendOTPEmail, sendAdminNotification, sendRejectionEmail } from "../utils/mailer.js";

const router = express.Router();

// ── Zod schemas ──
const registerSchema = z.object({
  fullName: z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(6),
  role:     z.enum(["doctor", "receptionist", "patient"]), // admin signup allowed nahi
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

const otpSchema = z.object({
  email: z.string().email(),
  otp:   z.string().length(6),
});

// ── Helper: 6-digit OTP generate ──
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// ════════════════════════════════════════
//  POST /api/auth/signup
//  Frontend wala new signup route
// ════════════════════════════════════════
router.post("/signup", async (req, res, next) => {
  try {
    const { fullName, email, password, role } = registerSchema.parse(req.body);

    // Duplicate check
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered." });
    }

    const needsApproval = role === "doctor" || role === "receptionist";

    // Patient → direct active + OTP for email verify
    // Doctor/Receptionist → pending_approval, admin decides OTP
    const otp        = generateOTP();
    const otpExpiry  = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    const user = new User({
      name:      fullName,
      email,
      password,
      role,
      status:    needsApproval ? "pending_approval" : "pending_otp",
      otp,
      otpExpiry,
    });
    await user.save();

    if (needsApproval) {
      // Notify admin — do not send OTP to user yet
      await sendAdminNotification({
        applicantName:  fullName,
        applicantEmail: email,
        role,
      });

      return res.status(201).json({
        success: true,
        message: "Request submitted. Awaiting admin approval.",
      });
    }

    // Patient — send OTP immediately
    await sendOTPEmail({ to: email, name: fullName, otp });

    return res.status(201).json({
      success: true,
      message: "Account created. Please verify your email with the OTP sent.",
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: error.errors });
    }
    next(error);
  }
});

// ════════════════════════════════════════
//  POST /api/auth/verify-otp
// ════════════════════════════════════════
router.post("/verify-otp", async (req, res, next) => {
  try {
    const { email, otp } = otpSchema.parse(req.body);

    const user = await User.findOne({ email }).select("+otp +otpExpiry");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.status !== "pending_otp") {
      return res.status(400).json({ success: false, message: "OTP verification not required for this account." });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ success: false, message: "No OTP found. Please request a new one." });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
    }

    // ✅ OTP correct — activate account
    user.status    = "active";
    user.otp       = undefined;
    user.otpExpiry = undefined;
    await user.save();

    return res.json({ success: true, message: "Account verified successfully. You can now log in." });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: error.errors });
    }
    next(error);
  }
});

// ════════════════════════════════════════
//  POST /api/auth/resend-otp
// ════════════════════════════════════════
router.post("/resend-otp", async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.status !== "pending_otp") {
      return res.status(400).json({ success: false, message: "OTP resend not allowed for this account." });
    }

    const otp       = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.otp       = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    await sendOTPEmail({ to: email, name: user.name, otp });

    return res.json({ success: true, message: "OTP resent successfully." });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: error.errors });
    }
    next(error);
  }
});

// ════════════════════════════════════════
//  POST /api/auth/admin/approve/:userId
//  Admin approves → OTP send karo user ko
// ════════════════════════════════════════
router.post("/admin/approve/:userId", authMiddleware, async (req, res, next) => {
  try {
    // Sirf admin approve kar sakta hai
    if (req.user.role !== "admin" && req.user.role !== "super-admin") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.status !== "pending_approval") {
      return res.status(400).json({ success: false, message: "User is not pending approval." });
    }

    // Generate OTP aur status update karo
    const otp       = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.status    = "pending_otp";
    user.otp       = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // OTP email bhejo user ko
    await sendOTPEmail({ to: user.email, name: user.name, otp });

    return res.json({ success: true, message: `OTP sent to ${user.email}. User can now verify.` });

  } catch (error) {
    next(error);
  }
});

// ════════════════════════════════════════
//  POST /api/auth/admin/reject/:userId
//  Admin rejects request
// ════════════════════════════════════════
router.post("/admin/reject/:userId", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "super-admin") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.status !== "pending_approval") {
      return res.status(400).json({ success: false, message: "User is not pending approval." });
    }

    user.status = "rejected";
    await user.save();

    // Rejection email bhejo
    await sendRejectionEmail({ to: user.email, name: user.name, role: user.role });

    return res.json({ success: true, message: "User request rejected." });

  } catch (error) {
    next(error);
  }
});

// ════════════════════════════════════════
//  POST /api/auth/login  — UPDATED
// ════════════════════════════════════════
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    // ── Return status so AuthContext can handle each case ──
    if (user.status !== "active") {
      console.log("[auth] login blocked", { userId: user._id?.toString(), status: user.status });
      return res.status(200).json({        // 200 so frontend gets the payload
        success: true,
        token: null,
        user: {
          id:     user._id,
          name:   user.name,
          email:  user.email,
          role:   user.role,
          status: user.status,             // ← AuthContext checks this
        },
      });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      user: {
        id:     user._id,
        name:   user.name,
        email:  user.email,
        role:   user.role,
        status: user.status,               // ← always include
        phone:  user.phone,
        subscriptionPlan: user.subscriptionPlan,
        ...(user.role === "doctor" && { specialization: user.specialization }),
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: error.errors });
    }
    next(error);
  }
});

// ════════════════════════════════════════
//  GET /api/auth/me  — UPDATED
// ════════════════════════════════════════
router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    console.log("[auth] /me hit", { userId: req.user?.userId, role: req.user?.role });
    const user = await User.findById(req.user.userId).select("-password -otp -otpExpiry");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.json({
      success: true,
      user: {
        id:     user._id,
        name:   user.name,
        email:  user.email,
        role:   user.role,
        status: user.status,               // ← included
        phone:  user.phone,
        subscriptionPlan: user.subscriptionPlan,
        ...(user.role === "doctor" && { specialization: user.specialization }),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
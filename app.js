import "dotenv/config"; // Important: Loads .env variables first

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";

import patientRoutes from "./routes/patients.js";
import appointmentRoutes from "./routes/appointments.js";
import entryRoutes from "./routes/entry.js";
import aiRoutes from "./routes/ai.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import prescriptionRoutes from "./routes/prescriptions.js";
import analyticsRoutes from "./routes/analytics.js";

connectDB();

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Serve static PDFs
app.use("/prescriptions", express.static(path.join(__dirname, "public", "prescriptions")));
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/analytics", analyticsRoutes);

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

app.use("/api/entries", entryRoutes);
app.use("/api/ai", aiRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
import express from "express";
import Groq from "groq-sdk";
import { z } from "zod";
import DiagnosisLog from "../models/DiagnosisLog.js";
import authMiddleware from "../middleware/auth.js";
import { hasProPlan } from "../middleware/roles.js";

const router = express.Router();

let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// Global fallback handler for AI endpoints
const handleAIFallback = (res, fallbackData) => {
  return res.json({
    success: true,
    isFallback: true,
    message: "AI service is currently unavailable. Using standard protocol.",
    data: fallbackData
  });
};

// Safe JSON parse helper
const safeParseAIResponse = (completion) => {
  const rawContent = completion.choices[0]?.message?.content;
  if (!rawContent) {
    throw new Error("AI returned an empty response");
  }
  return JSON.parse(rawContent);
};

// Zod schemas for validation
const symptomCheckerSchema = z.object({
  symptoms: z.string().min(5),
  age: z.number().int().min(0).max(120),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  medicalHistory: z.string().optional(),
  patientId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});

const explainPrescriptionSchema = z.object({
  diagnosis: z.string().min(3),
  medicines: z.array(z.object({})).optional(), // Loose for flexibility
  advice: z.string().optional(),
  language: z.string().default("English"),
});

const riskFlaggingSchema = z.object({
  patientHistory: z.array(z.object({})).min(1),
});

// Smart Symptom Checker
router.post("/symptom-checker", authMiddleware, async (req, res) => {
  try {
    const validated = symptomCheckerSchema.parse(req.body);
    const { symptoms, age, gender, medicalHistory, patientId } = validated;

    if (!groq) {
      return handleAIFallback(res, {
        conditions: ["Consult Doctor for accurate diagnosis"],
        riskLevel: "medium",
        suggestedTests: ["Complete Blood Count (CBC)", "General Physical Exam"]
      });
    }

    const prompt = `As a medical AI assistant, analyze the following case:
    Symptoms: ${symptoms}
    Age: ${age}
    Gender: ${gender}
    Medical History: ${medicalHistory || 'None provided'}
    
    Provide a JSON response with exactly this structure:
    {
      "riskAssessment": {
        "level": "low" | "medium" | "high",
        "confidence": number (percentage 0-100)
      },
      "possibleConditions": [
        { "name": "string", "match": number (percentage) }
      ],
      "summary": "short medical summary",
      "carePlan": "clinical care plan",
      "suggestedTests": ["Test 1", "Test 2"],
      "redFlags": ["specific warning signs to monitor"]
    }`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a clinical assistant that strictly outputs valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 1024,
      response_format: { type: "json_object" }
    });

    const aiResponse = safeParseAIResponse(completion);

    // Save diagnosis log if patientId is provided (assuming doctor is calling this)
    if (patientId && req.user.role === 'doctor') {
      await DiagnosisLog.create({
        patientId,
        doctorId: req.user.userId,
        symptoms,
        age,
        gender,
        medicalHistory,
        aiResponse,
        riskLevel: aiResponse.riskAssessment?.level || 'medium',
        aiConfidence: aiResponse.riskAssessment?.confidence || 0
      });
    }

    res.json({
      success: true,
      isFallback: false,
      data: aiResponse
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: error.errors });
    }
    console.error("AI Symptom Checker Error:", error);
    return handleAIFallback(res, {
      conditions: ["Consult Doctor for accurate diagnosis (AI Error)"],
      riskLevel: "medium",
      suggestedTests: ["Clinical evaluation required"]
    });
  }
});

// Explain Prescription to Patient
router.post("/explain-prescription", authMiddleware, async (req, res) => {
  try {
    const validated = explainPrescriptionSchema.parse(req.body);
    const { diagnosis, medicines, advice, language } = validated;

    if (!groq) {
      return handleAIFallback(res, {
        simpleExplanation: `For ${diagnosis}, please take medicines as prescribed. ${advice}`,
        lifestyleRecommendations: ["Rest well", "Drink plenty of water", "Follow up as advised"],
        preventiveAdvice: ["Maintain hygiene", "Take prescribed doses accurately"]
      });
    }

    const prompt = `Translate this medical prescription into simple, easy-to-understand terms for a patient in ${language}.
    Diagnosis: ${diagnosis}
    Medicines: ${JSON.stringify(medicines)}
    Doctor's Advice: ${advice}
    
    Output strictly as JSON:
    {
      "simpleExplanation": "Easy to understand summary of the condition and overall treatment",
      "lifestyleRecommendations": ["list of lifestyle changes"],
      "preventiveAdvice": ["list of preventive care tips"]
    }`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a friendly patient-care assistant. Always reply with valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: "json_object" }
    });

    res.json({
      success: true,
      isFallback: false,
      data: safeParseAIResponse(completion)
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: error.errors });
    }
    console.error("AI Explain Error:", error);
    // Fixed: don't reference `diagnosis`/`advice` here — they may be out of scope if parse failed
    return handleAIFallback(res, {
      simpleExplanation: "Please take medicines as prescribed and follow your doctor's advice.",
      lifestyleRecommendations: ["Follow doctor's direct advice"],
      preventiveAdvice: ["Standard precautionary measures apply"]
    });
  }
});

// Risk Flagging & Predictive Analysis (Requires Pro Plan)
router.post("/risk-flagging", authMiddleware, hasProPlan, async (req, res) => {
  try {
    const validated = riskFlaggingSchema.parse(req.body);
    const { patientHistory } = validated;

    if (!groq) {
      return handleAIFallback(res, {
        riskFlags: ["Standard monitoring recommended"],
        chronicDetect: false,
        insights: "AI analysis unavailable. Please review manually."
      });
    }

    const prompt = `Analyze this patient's medical history timeline and detect any chronic patterns or high-risk infection combinations.
    History: ${JSON.stringify(patientHistory)}
    
    Output strictly as JSON:
    {
      "riskFlags": ["List of detected risks or repeated patterns"],
      "chronicDetect": true/false based on recurrence,
      "insights": "Short paragraph analyzing potential hidden issues"
    }`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are an expert diagnostic AI for physicians. Output strictly valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 1024,
      response_format: { type: "json_object" }
    });

    res.json({
      success: true,
      isFallback: false,
      data: safeParseAIResponse(completion)
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: error.errors });
    }
    console.error("AI Risk Flagging Error:", error);
    return handleAIFallback(res, {
      riskFlags: ["Manual doctor review required"],
      chronicDetect: false,
      insights: "AI system error during analysis."
    });
  }
});

// Get AI Diagnosis History for a Patient
router.get("/history/:patientId", authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Validate patientId format
    if (!patientId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: "Invalid patient ID format" });
    }

    // Authorization: patients can only view their own history
    if (req.user.role === 'patient' && req.user.userId !== patientId) {
      return res.status(403).json({ success: false, message: "Access denied. You can only view your own history." });
    }

    const history = await DiagnosisLog.find({ patientId })
      .sort({ createdAt: -1 })
      .limit(10);
      
    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error("AI History Error:", error);
    res.status(500).json({ success: false, message: "Error fetching history" });
  }
});

export default router;
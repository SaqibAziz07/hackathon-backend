import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function testKey() {
  try {
    const response = await groq.models.list(); // Simple API call
    console.log("API Key is valid ✅");
  } catch (err) {
    console.error("API Key invalid ❌", err.message);
  }
}

testKey();
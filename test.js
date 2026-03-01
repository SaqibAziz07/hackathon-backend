import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testKey() {
  try {
    const response = await openai.models.list(); // simple API call
    console.log("API Key is valid ✅");
  } catch (err) {
    console.error("API Key invalid ❌", err.message);
  }
}

testKey();
@echo off
echo Starting Backend Server...
echo Setting environment variables...

set GROQ_API_KEY=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
set PORT=5000
set MONGO_URI=mongodb://127.0.0.1:27017/hackathon

echo ✅ Environment variables set
echo Starting server...

npm start
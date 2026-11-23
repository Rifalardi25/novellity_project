const { GoogleGenAI } = require('@google/genai');

if (!process.env.GEMINI_API_KEY) {
  console.warn('[PERINGATAN] GEMINI_API_KEY belum diatur di dalam berkas .env');
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-4-hydrogen';
const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS, 10) || 55000;

module.exports = {
  ai,
  GEMINI_MODEL,
  AI_TIMEOUT_MS,
};
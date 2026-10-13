// Garanti harcama maili yerelde okunamazsa (garanti.js spendOf → { ai }) yapay zeka işyeri ve tutarı çıkarır.
// Sunucu (/api/mail/push) ve zamanlanmış görev (plan-reminders) kullanır; yanıtı garanti.js fromAi denetler.
import { callGemini } from "./gemini.js";
import { AI_SCHEMA, AI_SYSTEM, aiText } from "../garanti.js";

export const garantiAi = async (mail) =>
  process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL ? callGemini({ model: process.env.GEMINI_MODEL, system: AI_SYSTEM, user: aiText(mail), schema: AI_SCHEMA, maxTokens: 400, timeoutMs: 12000 }) : null;

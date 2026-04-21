const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.KEY });

const clientName = '';

const SYSTEM_PROMPT =
  `You are a helpful WhatsApp assistant for ${clientName}. ` +
  `Never say you are Gemini, an AI by Google, or mention any AI company. ` +
  `You are ${clientName}'s personal AI assistant. Keep replies short and friendly.`;

const MODEL = "gemini-3-flash-preview";

const rateLimitMap = new Map();
function isRateLimited(userId) {
  const now = Date.now();
  const LIMIT = 3;
  const WINDOW = 60 * 1000;

  const entry = rateLimitMap.get(userId) || { count: 0, start: now };
  if (now - entry.start > WINDOW) { entry.count = 0; entry.start = now; }
  entry.count++;
  rateLimitMap.set(userId, entry);
  return entry.count > LIMIT;
}
async function getAIResponse(userMessage) {
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 5000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          { role: "user",  parts: [{ text: "Who are you?" }] },
          { role: "model", parts: [{ text: `I'm ${clientName}'s personal AI assistant. How can I help you?` }] },
          { role: "user",  parts: [{ text: SYSTEM_PROMPT + "\n\nUser message: " + userMessage }] }
        ],
        config: {
          temperature: 0.1,
          maxOutputTokens: 200
        }
      });

      return response.text;

    } catch (err) {
      const is429 = err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED');

      if (is429 && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * attempt;
        console.log(`Rate limited by Google. Retry ${attempt}/${MAX_RETRIES - 1} in ${delay / 1000}s...`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }
}

const client = new Client({ authStrategy: new LocalAuth() });

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('Scan QR Code...');
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.on('message', async (message) => {
  try {
    if (message.fromMe) return;
    if (message.from === 'status@broadcast') return;
    if (!message.body || message.body.trim() === '') return;

    const userMsg = message.body.trim();
    console.log(`From ${message.from}: ${userMsg}`);

    if (isRateLimited(message.from)) {
      console.log(`Rate limited: ${message.from}`);
      return await client.sendMessage(
        message.from,
        "Too many messages! Please wait a minute before sending again."
      );
    }

    if (/who are you/i.test(userMsg)) {
      return await client.sendMessage(
        message.from,
        `I'm ${clientName}'s personal AI assistant. How can I help you?`
      );
    }

    const aiReply = await getAIResponse(userMsg);
    await client.sendMessage(message.from, aiReply);

  } catch (err) {
    const is429 = err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED');
    console.error("Error:", err.message);

    await client.sendMessage(
      message.from,
      is429
        ? "I'm a bit busy right now. Please send your message again in a minute!"
        : "Something went wrong. Please try again later."
    );
  }
});

client.initialize();
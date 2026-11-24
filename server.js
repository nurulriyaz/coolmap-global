import express from "express";
import "dotenv/config";
import OpenAI from "openai";

const app = express();
app.use(express.json({ limit: "30kb" }));

// CORS (for local dev only)
app.use((req, res, next) => {
  res.set({
    "Access-Control-Allow-Origin": process.env.ALLOW_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  });
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.static("public"));

// ---- DeepSeek client (OpenAI-compatible) ----
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

const SYSTEM = `You are CoolMap's climate-adaptation analyst. Use ONLY the JSON data provided; never invent numbers or events; say when something is unknown. Be concise and practical, with short sections and **bold** headings. Heat risk uses feels-like temperature. Tree cooling figures are planning estimates, not forecasts.`;

const TASKS = {
  brief: "Write a 5-line heat briefing: current situation, who is most at risk, the next 24h trend, one air-quality note, one action for today.",
  plan: "Act as an urban planner. Give 3 quick wins (under 3 months) and 3 long-term cooling actions tied to the data. Mention the tree simulator result.",
  safety: "Give personal safety advice for today: hydration, best and worst hours outdoors (use the hourly data), clothing, and warning signs of heat illness.",
  compare: "Compare place a and place b: which is riskier now and later today, who should take care in each, and one action for each. Use the numbers.",
};

// ---- Rate limiter: 100 requests / minute / IP ----
const hits = new Map();
const limited = (ip) => {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 100;
};

// ---- AI endpoint ----
app.post("/api/ai", async (req, res) => {
  if (limited(req.ip)) {
    return res.status(429).json({ error: "Too many requests. Wait a minute." });
  }
  if (!process.env.DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: "DEEPSEEK_API_KEY missing in .env" });
  }

  const { mode, question, context } = req.body || {};
  if (!context || typeof context !== "object") {
    return res.status(400).json({ error: "Missing context" });
  }

  const task =
    TASKS[mode] ||
    `Answer the user's question using the data: "${String(question || "").slice(0, 400)}"`;

  try {
    console.log(`[AI] mode=${mode || "question"} model=${MODEL}`);

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `${task}\n\nDATA:\n${JSON.stringify(context)}` },
      ],
      max_tokens: 700,
      temperature: 0.4,
    });

    const text = completion.choices?.[0]?.message?.content || "";
    console.log(`[AI] ok ${text.length} chars`);
    res.json({ text });
  } catch (err) {
    console.error("[AI] error:", err.status, err.message);
    res.status(502).json({
      error: err.message || "Could not reach the DeepSeek API",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CoolMap running → http://localhost:${PORT}`);
  console.log(`  Model:  ${MODEL}`);
  console.log(`  Key:    ${process.env.DEEPSEEK_API_KEY ? "loaded" : "MISSING"}`);
});
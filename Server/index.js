import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import { DailyQuote, DEFAULT_DAILY_QUOTES } from "./Models/DailyQuote.js";
import { getYoutubeTranscriptPlainText } from "./utils/youtubeTranscript.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

connectDB();
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);

const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "https://ollama.com/v1";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma3:4b";

async function callOllama(systemPrompt, userContent, opts = {}) {
  const { temperature = 0.7, maxTokens = 4096 } = opts;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];

  const headers = { "Content-Type": "application/json" };
  if (OLLAMA_API_KEY) headers["Authorization"] = `Bearer ${OLLAMA_API_KEY}`;

  const res = await fetch(`${OLLAMA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: OLLAMA_MODEL, messages, temperature, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "unknown error");
    throw new Error(`Ollama API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || data?.message?.content || "";
  if (!text) throw new Error("Ollama returned an empty response");
  return text;
}

function extractJsonObjects(text) {
  const objects = [];
  let braceCount = 0;
  let startIdx = -1;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '{') {
      if (braceCount === 0) {
        startIdx = i;
      }
      braceCount++;
    } else if (char === '}') {
      if (braceCount > 0) {
        braceCount--;
        if (braceCount === 0 && startIdx !== -1) {
          const objStr = text.slice(startIdx, i + 1);
          try {
            const parsed = JSON.parse(objStr);
            if (parsed && typeof parsed === "object") {
              objects.push(parsed);
            }
          } catch {
            // ignore
          }
        }
      }
    }
  }
  return objects;
}

function parseJsonArrayFromModel(rawText) {
  const cleaned = rawText.replace(/```json|```/gi, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    const objects = extractJsonObjects(cleaned);
    if (objects.length > 0) {
      return objects;
    }
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try { return JSON.parse(arrayMatch[0]); } catch {}
    }
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try { return [JSON.parse(objectMatch[0])]; } catch {}
    }
    throw new Error("Model did not return a valid JSON array or object");
  }
}

app.post("/api/daily-quote", async (req, res) => {
  try {
    let quote;
    try {
      const count = await DailyQuote.countDocuments();
      if (count === 0) {
        await DailyQuote.insertMany(
          DEFAULT_DAILY_QUOTES.map((t) => ({ text: t })),
          { ordered: false }
        );
      }
      const picked = await DailyQuote.aggregate([{ $sample: { size: 1 } }]);
      quote = picked?.[0]?.text || DEFAULT_DAILY_QUOTES[0];
    } catch {
      quote = DEFAULT_DAILY_QUOTES[Math.floor(Math.random() * DEFAULT_DAILY_QUOTES.length)];
    }
    if (!quote) quote = DEFAULT_DAILY_QUOTES[0];
    return res.json({ quote: String(quote).trim() });
  } catch (err) {
    console.error("daily-quote:", err);
    return res.status(500).json({ error: err.message || "Quote failed" });
  }
});

app.post("/api/ask", async (req, res) => {
  try {
    const { question, imageBase64, mimeType } = req.body;
    const text = question != null ? String(question).trim() : "";

    if (!text && !imageBase64) {
      return res.status(400).json({ error: "Send a question and/or an image." });
    }

    const userPrompt =
      text ||
      "Explain or solve what is shown in this image. If it is a handwritten or printed question, solve it step by step.";

    const systemPrompt = `You are a supportive AI tutor for students — warm, encouraging, and patient. Sound like a friendly mentor, not a textbook.

Response style:
- Use plain text only. No Markdown, no headings, no bold, no backticks.
- Be concise: short paragraphs, no filler.
- Lead with the direct answer in 1–2 friendly sentences.
- Use numbered steps or dashes when helpful — not asterisk bullets.
- Offer reassurance when genuine. No empty cheerleading.
- End with one quick tip only if it actually helps.`;

    let userContent;
    if (imageBase64 && String(imageBase64).length > 0) {
      const mt = mimeType && String(mimeType).startsWith("image/") ? String(mimeType) : "image/png";
      userContent = [
        { type: "text", text: userPrompt },
        { type: "image_url", image_url: { url: `data:${mt};base64,${String(imageBase64)}` } },
      ];
    } else {
      userContent = userPrompt;
    }

    const answer = await callOllama(systemPrompt, userContent, { temperature: 0.6, maxTokens: 2048 });
    res.json({ answer });
  } catch (err) {
    console.error("AI Tutor error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/generate-cards", async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: "Topic is required" });

    const systemPrompt = `You are a helpful assistant. Generate exactly 5 high-quality flashcards for the given topic.
Return ONLY a valid JSON array of objects, no markdown blocks, no prefix/suffix text. Ensure all brackets and quotes are closed.
JSON Schema:
[{"question": "string", "answer": "string", "subject": "string", "type": "Concept|Problem|Theory"}]`;

    const rawText = await callOllama(systemPrompt, `Topic: ${topic}`, { temperature: 0.2, maxTokens: 2000 });
    const cards = parseJsonArrayFromModel(rawText);

    const normalized = cards
      .map((c) => ({
        question: String(c.question ?? "").trim(),
        answer: String(c.answer ?? "").trim(),
        subject: String(c.subject ?? topic).trim(),
        type: c.type,
      }))
      .filter((c) => c.question && c.answer);

    if (normalized.length === 0) return res.status(500).json({ error: "No valid cards could be parsed" });
    res.json({ cards: normalized });
  } catch (err) {
    console.error("Card Gen Error:", err);
    res.status(500).json({ error: "Failed to generate structured cards" });
  }
});

app.post("/api/problem-of-day", async (req, res) => {
  try {
    const trackRaw = String(req.body?.exam ?? "JEE").trim().toUpperCase();
    const track = ["NEET", "JEE", "UPSC"].includes(trackRaw) ? trackRaw : "JEE";
    const examContext =
      track === "NEET" ? "NEET (UG) style" :
      track === "UPSC" ? "UPSC CSE Prelims / CSAT style" :
      "JEE Main / Advanced style";

    const prompt = `Exam: ${track} (${examContext}). Pick ONE random topic and write exactly ONE MCQ.
Return ONLY a JSON array with one item:
{
  "question": "string",
  "options": ["A", "B", "C", "D"],
  "correctIndex": 0,
  "explanation": "brief",
  "subtopic": "short label",
  "sourceLabel": "PYQ-style year"
}
correctIndex 0-3.`;

    const rawText = await callOllama(
      "You are a helpful assistant. You write Indian competitive-exam MCQs. Output ONLY a valid JSON array containing exactly one object according to the schema provided. No markdown blocks, no prefix/suffix text. Ensure all brackets and quotes are closed correctly.",
      prompt,
      { temperature: 0.2, maxTokens: 1024 }
    );

    const parsed = parseJsonArrayFromModel(rawText);
    const q = Array.isArray(parsed) ? parsed[0] : null;
    if (!q?.question) return res.status(500).json({ error: "Invalid problem" });

    const options = Array.isArray(q.options) ? q.options.map((o) => String(o ?? "").trim()) : [];
    let idx = Number(q.correctIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) {
      const strIdx = String(q.correctIndex ?? "").trim().toUpperCase();
      if (strIdx === "A" || strIdx === "0") idx = 0;
      else if (strIdx === "B" || strIdx === "1") idx = 1;
      else if (strIdx === "C" || strIdx === "2") idx = 2;
      else if (strIdx === "D" || strIdx === "3") idx = 3;
      else idx = 0;
    }
    while (options.length < 4) options.push("");

    return res.json({
      question: {
        question: String(q.question).trim(),
        options: options.slice(0, 4),
        correctIndex: idx,
        explanation: String(q.explanation ?? "").trim() || "—",
        subtopic: String(q.subtopic ?? "").trim() || track,
        sourceLabel: String(q.sourceLabel ?? "").trim() || `${track} (PYQ-style)`,
      },
      examTrack: track,
    });
  } catch (err) {
    console.error("problem-of-day:", err);
    return res.status(500).json({ error: err.message || "Problem failed" });
  }
});

app.post("/api/generate-mcq", async (req, res) => {
  try {
    const { topic, examTrack, mockTest } = req.body;
    if (!topic || !String(topic).trim()) return res.status(400).json({ error: "Topic or concept is required" });

    const trackRaw = String(examTrack ?? "JEE").trim().toUpperCase();
    const track = ["NEET", "JEE", "UPSC"].includes(trackRaw) ? trackRaw : "JEE";
    const isMock = Boolean(mockTest);
    const t = String(topic).trim();

    const isFullPyq = isMock || /full\s*pyq|full\s*paper|mock\s*test|all\s*chapters/i.test(t);
    const questionTarget = isFullPyq ? 60 : 15;
    const minRequired = isFullPyq ? 25 : 8;

    const examContext =
      track === "NEET" ? `NEET (UG) style. Label examples: "NEET 2019", "NEET 2022".` :
      track === "UPSC" ? `UPSC CSE Prelims / CSAT style. Label examples: "UPSC Prelims 2019".` :
      `JEE Main and JEE Advanced style. Label examples: "JEE Main 2019", "JEE Advanced 2018".`;

    let rawQuestions = [];

    if (isFullPyq) {
      // 4 batches of 15 questions in parallel
      const batchPromises = [];
      for (let batch = 1; batch <= 4; batch++) {
        const batchPrompt = `Exam track: ${track} (${examContext})
Topic: """${t}"""

This is batch ${batch} of 4. Generate EXACTLY 15 distinct, unique MCQs. Each has exactly 4 options. Match difficulty to real ${track} PYQs. Keep explanation short (1-2 sentences).

For every question set "sourceLabel" to the exam + year. If not verifiable, add " (PYQ-style)".

Return ONLY a JSON array of 15 objects:
[
  {
    "question": "string",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "1-2 sentences",
    "subtopic": "short label",
    "sourceLabel": "Exam YYYY (PYQ-style)"
  }
]`;

        batchPromises.push(
          callOllama(
            "You are a helpful assistant. You write Indian competitive-exam MCQs (JEE, NEET, UPSC). Output ONLY a valid JSON array of objects according to the schema. No markdown blocks, no prefix/suffix text. Ensure all brackets and quotes are closed correctly.",
            batchPrompt,
            { temperature: 0.7, maxTokens: 4000 }
          ).then((rawText) => {
            const parsed = parseJsonArrayFromModel(rawText);
            return Array.isArray(parsed) ? parsed : [];
          }).catch((err) => {
            console.error(`Error in batch ${batch}:`, err);
            return [];
          })
        );
      }

      const results = await Promise.all(batchPromises);
      for (const batchQs of results) {
        rawQuestions.push(...batchQs);
      }
    } else {
      // Single call for 15 questions
      const prompt = `Exam track: ${track} (${examContext})
Topic: """${t}"""

Generate EXACTLY 15 distinct MCQs. Each has exactly 4 options. Match difficulty to real ${track} PYQs. Keep explanation short (1-2 sentences).

For every question set "sourceLabel" to the exam + year. If not verifiable, add " (PYQ-style)".

Return ONLY a JSON array of 15 objects:
[
  {
    "question": "string",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "1-2 sentences",
    "subtopic": "short label",
    "sourceLabel": "Exam YYYY (PYQ-style)"
  }
]`;

      const rawText = await callOllama(
        "You are a helpful assistant. You write Indian competitive-exam MCQs (JEE, NEET, UPSC). Output ONLY a valid JSON array of objects according to the schema. No markdown blocks, no prefix/suffix text. Ensure all brackets and quotes are closed correctly.",
        prompt,
        { temperature: 0.2, maxTokens: 4000 }
      );
      const parsed = parseJsonArrayFromModel(rawText);
      if (Array.isArray(parsed)) {
        rawQuestions = parsed;
      }
    }

    const randomYear = () => 2010 + Math.floor(Math.random() * 15);
    const defaultLabel = () => {
      const y = randomYear();
      if (track === "NEET") return `NEET ${y} (PYQ-style)`;
      if (track === "UPSC") return `UPSC Prelims ${y} (PYQ-style)`;
      return `JEE Main ${y} (PYQ-style)`;
    };

    const normalized = rawQuestions
      .map((q) => {
        const options = Array.isArray(q.options) ? q.options.map((o) => String(o ?? "").trim()) : [];
        let idx = Number(q.correctIndex);
        if (!Number.isInteger(idx) || idx < 0 || idx > 3) {
          const strIdx = String(q.correctIndex ?? "").trim().toUpperCase();
          if (strIdx === "A" || strIdx === "0") idx = 0;
          else if (strIdx === "B" || strIdx === "1") idx = 1;
          else if (strIdx === "C" || strIdx === "2") idx = 2;
          else if (strIdx === "D" || strIdx === "3") idx = 3;
          else idx = 0;
        }
        while (options.length < 4) options.push("");
        let sourceLabel = String(q.sourceLabel ?? "").trim();
        if (!sourceLabel) sourceLabel = defaultLabel();
        return {
          question: String(q.question ?? "").trim(),
          options: options.slice(0, 4),
          correctIndex: Math.min(3, Math.max(0, idx)),
          explanation: String(q.explanation ?? "").trim() || "—",
          subtopic: String(q.subtopic ?? t).trim() || t,
          sourceLabel,
        };
      })
      .filter((q) => q.question && q.options.every(Boolean));

    const finalQuestions = normalized;
    if (finalQuestions.length < minRequired) {
      return res.status(500).json({ error: "Too few valid questions generated — try rephrasing the topic" });
    }

    res.json({ questions: finalQuestions, topic: t, examTrack: track, mockTest: isMock });
  } catch (err) {
    console.error("MCQ Gen Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate MCQs" });
  }
});

app.post("/api/study-plan", async (req, res) => {
  try {
    const { examType, examDate, chapters } = req.body;
    if (!examType || !String(examType).trim()) return res.status(400).json({ error: "Exam type is required" });
    if (!examDate || !String(examDate).trim()) return res.status(400).json({ error: "Exam date is required" });
    if (!Array.isArray(chapters) || chapters.length === 0) return res.status(400).json({ error: "Add at least one syllabus chapter" });

    const normalizedChapters = chapters.map((c) => {
      const name = String(c?.name ?? "").trim() || "Untitled chapter";
      const s = String(c?.status ?? "Not Started");
      const status = ["Completed", "Weak", "Not Started"].includes(s) ? s : "Not Started";
      return { name, status };
    });

    const chaptersBlock = normalizedChapters.map((c) => `- ${c.name} (${c.status})`).join("\n");

    const prompt = `Create a 7-day study plan:

Exam: ${String(examType).trim()}
Exam Date: ${String(examDate).trim()}

Chapters:
${chaptersBlock}

Statuses: Completed = strong, Weak = needs revision, Not Started = untouched.

Rules:
1. Prioritize weak and not-started chapters
2. Include revision for completed chapters
3. Realistic for 6-8 hrs/day
4. Each day: Topics, Time Plan, Tasks, one smart tip

Format strictly:
Day 1:
- Topics:
- Time Plan:
- Tasks:
- Tip:

... Day 7

Final Tips:
- bullet points`;

    const plan = await callOllama(
      "You are an expert academic mentor for JEE, NEET, UPSC. Follow the output format exactly.",
      prompt,
      { temperature: 0.2, maxTokens: 4096 }
    );

    res.json({ plan });
  } catch (err) {
    console.error("Study plan error:", err);
    res.status(500).json({ error: err.message || "Failed to generate study plan" });
  }
});

app.post("/api/summarize-youtube", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !String(url).trim()) return res.status(400).json({ error: "YouTube URL is required" });

    const { text, source } = await getYoutubeTranscriptPlainText(String(url).trim());

    const maxChars = 12000;
    const truncated = text.length > maxChars ? text.slice(0, maxChars) + "\n\n[Transcript truncated]" : text;

    const systemPrompt = `You are a helpful assistant. Summarize YouTube transcripts for students. Output ONLY a valid JSON object matching the schema below. No markdown blocks, no prefix/suffix text. Ensure all brackets and quotes are closed correctly.
JSON Schema:
{
  "title": "short title",
  "summary": "2-4 paragraphs",
  "keyPoints": ["string", ...],
  "concepts": ["tag1", ...]
}
Rules: faithful to transcript, 5-10 keyPoints, 4-10 concept tags.`;

    const rawText = await callOllama(
      systemPrompt,
      `Source: ${source}\n\nTranscript:\n"""${truncated}"""`,
      { temperature: 0.2, maxTokens: 2048 }
    );

    const cleaned = rawText.replace(/```json|```/gi, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { title: "Video summary", summary: rawText, keyPoints: [], concepts: [] };
    }

    res.json({
      title: String(parsed.title ?? "Video"),
      summary: String(parsed.summary ?? ""),
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
      transcriptSource: source,
      transcriptChars: text.length,
    });
  } catch (err) {
    console.error("summarize-youtube:", err);
    res.status(500).json({ error: err.message || "Failed to summarize video" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Ollama model: ${OLLAMA_MODEL} — ${OLLAMA_BASE_URL}`);
});
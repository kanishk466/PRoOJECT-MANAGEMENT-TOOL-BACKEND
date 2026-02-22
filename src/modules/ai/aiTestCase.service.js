import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

export async function generateTestCasesFromAI(ticket) {
  const prompt = buildPrompt(ticket);
  let lastError = null;

  for (const model of MODELS) {
    try {
      console.log(`Trying model: ${model}`);

      const geminiModel = genAI.getGenerativeModel({
        model,
        systemInstruction:
          "You are a senior QA engineer. Always return strict JSON only.",
      });

      const result = await geminiModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      });

      const raw = result.response.text();
      const parsed = safeJSONParse(raw);

      const normalized = normalizeTestCases(parsed);

      return {
        data: normalized,
        modelUsed: model,
      };

    } catch (error) {
      lastError = error;

      const message = error.message?.toLowerCase() ?? "";
      const status = error.status;

      if (
        status === 429 ||
        status === 404 ||
        message.includes("quota") ||
        message.includes("rate limit") ||
        message.includes("not found") ||
        message.includes("context length")
      ) {
        console.warn(`Model ${model} failed. Trying next model...`);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

/* ===========================
   Prompt Builder
=========================== */

function buildPrompt(ticket) {
  return `
You are a senior QA engineer.

Generate structured QA test cases in STRICT JSON format.

Ticket Title: ${ticket.title}
Description: ${ticket.description}
Priority: ${ticket.priority}

Rules:
- Generate 3 positive
- 3 negative
- 2 edge cases
- Include validation & security scenarios if applicable

Each object MUST contain ONLY:
- title
- type (positive | negative | edge)
- preconditions (array of strings)
- steps (array of strings)
- expectedResult
- priority (critical | high | medium | low)

DO NOT include:
- id
- severity
- test_type
- roles
- description
- any extra fields

Return JSON array only.
  `;
}

/* ===========================
   Safe JSON Parsing
=========================== */

function safeJSONParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleaned);
  }
}

/* ===========================
   Normalization Layer
=========================== */

function normalizeTestCases(testCases) {
  if (!Array.isArray(testCases)) {
    throw new Error("Invalid AI response format");
  }

  return testCases.map((tc) => ({
    title: tc.title || "Untitled Test Case",

    type: mapType(tc.type),

    preconditions: Array.isArray(tc.preconditions)
      ? tc.preconditions
      : [],

    steps: Array.isArray(tc.steps)
      ? tc.steps
      : [],

    expectedResult:
      tc.expectedResult ||
      tc.expected_result ||
      "",

    priority: mapPriority(tc.priority),
  }));
}

/* ===========================
   Enum Mapping
=========================== */

function mapType(type) {
  const value = (type || "").toLowerCase();

  if (value.includes("positive")) return "POSITIVE";
  if (value.includes("negative")) return "NEGATIVE";
  if (value.includes("edge")) return "EDGE";

  return "POSITIVE";
}

function mapPriority(priority) {
  const value = (priority || "").toLowerCase();

  if (value.includes("critical")) return "CRITICAL";
  if (value.includes("high")) return "HIGH";
  if (value.includes("medium")) return "MEDIUM";
  if (value.includes("low")) return "LOW";

  return "MEDIUM";
}
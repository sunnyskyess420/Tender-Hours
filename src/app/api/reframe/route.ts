// /api/reframe — server-side endpoint that scans a journal entry for BPD
// thinking patterns and offers a reframe. Ported from Healing Companion.
//
// Body:  { entry: string, memory: string }
// Resp:  { pattern: string, summary: string, suggestion: string }
//
// Required env vars:
//   OPENAI_API_KEY    — your provider's API key
//   OPENAI_BASE_URL   — (optional) provider's base URL; defaults to OpenAI
//   OPENAI_MODEL      — (optional) model name; defaults to "gpt-4o-mini"
//
// Some providers cut the reply off mid-sentence (observed with Gemini via the
// OpenAI-compatible endpoint: a well-formed JSON reply truncated at ~142
// characters, regardless of the token ceiling). So the reply is not trusted to
// arrive complete — it is parsed tolerantly, and if it stops mid-JSON the model
// is asked to continue from where it stopped.

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

interface ReframeResponse {
  pattern: string;
  summary: string;
  suggestion: string;
}

const MAX_ATTEMPTS = 3;
const MAX_TOKENS = 900;

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
  });
}

function getModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

/**
 * Pull a usable JSON object out of whatever the model actually returned.
 *
 * Order of attack:
 *   1. the raw text
 *   2. the raw text with markdown fences stripped
 *   3. the first balanced { ... } block (survives prose around the JSON)
 *   4. individual field values (survives a reply truncated mid-JSON)
 */
function extractReframe(raw: string): ReframeResponse | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidates: string[] = [trimmed];

  const unfenced = trimmed
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  if (unfenced !== trimmed) candidates.push(unfenced);

  const start = trimmed.indexOf("{");
  if (start !== -1) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          candidates.push(trimmed.slice(start, i + 1));
          break;
        }
      }
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof (parsed as ReframeResponse).pattern === "string"
      ) {
        return parsed as ReframeResponse;
      }
    } catch {
      // try the next candidate
    }
  }

  // The reply may have been cut off, so there is no complete JSON object. Pull
  // the fields out one at a time instead.
  const grab = (key: string): string | null => {
    const marker = `"${key}"`;
    const at = trimmed.indexOf(marker);
    if (at === -1) return null;
    let i = at + marker.length;
    while (i < trimmed.length && (trimmed[i] === " " || trimmed[i] === ":" || trimmed[i] === "\t")) i++;
    if (trimmed[i] !== '"') return null;
    i++;
    let out = "";
    while (i < trimmed.length) {
      const ch = trimmed[i];
      if (ch === "\\") {
        const next = trimmed[i + 1];
        if (next === undefined) return null;
        out += next === "n" ? "\n" : next;
        i += 2;
        continue;
      }
      if (ch === '"') return out;
      out += ch;
      i++;
    }
    // Ran off the end without a closing quote: genuinely truncated.
    return null;
  };

  const loosePattern = grab("pattern");
  if (loosePattern) {
    return {
      pattern: loosePattern,
      summary: grab("summary") ?? "",
      suggestion: grab("suggestion") ?? "",
    };
  }

  return null;
}

async function callModel(
  client: OpenAI,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  temperature: number
): Promise<string> {
  const completion = await client.chat.completions.create({
    model: getModel(),
    messages,
    temperature,
    max_tokens: MAX_TOKENS,
  });
  return completion?.choices?.[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  // Add ?debug=1 to include the raw model reply in the response. Used to
  // diagnose provider quirks; the app never sends this.
  const wantsDebug = new URL(req.url).searchParams.get("debug") === "1";
  const client = getClient();
  if (!client) {
    return NextResponse.json(
      {
        error:
          "AI is not configured. Set the OPENAI_API_KEY environment variable on this app's host (or in .env locally).",
      },
      { status: 503 }
    );
  }

  let body: { entry?: string; memory?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const entry = (body.entry ?? "").trim();
  const memory = (body.memory ?? "").trim();

  if (entry.length < 10) {
    return NextResponse.json({
      pattern: "none",
      summary: "Entry too short to scan.",
      suggestion: "",
    } as ReframeResponse);
  }

  if (entry.length > 4000) {
    return NextResponse.json(
      { error: "Entry too long (max 4000 characters)" },
      { status: 413 }
    );
  }

  const systemPrompt =
    memory ||
    `You are a gentle support tool for someone in BPD recovery. Scan their journal entry for BPD thinking patterns (splitting, all-or-nothing, abandonment fear, self-attack, mind-reading, catastrophizing). If found, return one observation and one reframe. No diagnostic language, no imperatives, no medical advice. If no pattern, return "none". Always reply with a single JSON object and nothing else, and keep it short.`;

  const userPrompt = `Journal entry:
"""
${entry}
"""

Reply with ONLY a JSON object. No prose, no markdown fences. Keep summary under 20 words and suggestion under 20 words.

{
  "pattern": "<splitting | all-or-nothing | abandonment_fear | self_attack | mind_reading | catastrophizing | none>",
  "summary": "<one short sentence observing the pattern>",
  "suggestion": "<one short sentence offering an alternative thought, in the user's voice, gentle, no 'you should'>"
}

If no pattern is present, use "none" as the pattern with empty summary and suggestion.`;

  try {
    const baseMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    let raw = "";
    let parsed: ReframeResponse | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt === 0) {
        raw = await callModel(client, baseMessages, 0.4);
      } else {
        // The previous reply stopped mid-JSON. Ask for just the remainder.
        raw += await callModel(
          client,
          [
            { role: "user", content: userPrompt },
            { role: "assistant", content: raw },
            {
              role: "user",
              content:
                "Your previous JSON was cut off. Output ONLY the remaining characters needed to complete it, starting exactly where you stopped. No repetition, no commentary, no code fences.",
            },
          ],
          0
        );
      }

      parsed = extractReframe(raw);

      // Complete enough to use? "none" needs nothing more; a real pattern needs
      // its reframe sentence.
      if (parsed && (parsed.pattern === "none" || parsed.suggestion)) break;
      if (!parsed) break;
    }

    const debugPayload = wantsDebug
      ? { model: getModel(), rawLength: raw.length, raw: raw.slice(0, 800) }
      : null;
    const debugSpread = debugPayload ? { debug: debugPayload } : {};

    if (!parsed) {
      const excerpt = raw.slice(0, 300).replace(/\s+/g, " ").trim();
      return NextResponse.json({
        pattern: "none",
        summary: `AI replied in a format we couldn't read (${raw.length} chars). Raw start: ${excerpt || "(empty)"}`,
        suggestion: "",
        ...debugSpread,
      } as ReframeResponse);
    }

    if (parsed.pattern === "none") {
      return NextResponse.json({
        pattern: "none",
        summary: "",
        suggestion: "",
        ...debugSpread,
      } as ReframeResponse);
    }

    return NextResponse.json({
      pattern: String(parsed.pattern).slice(0, 60),
      summary: String(parsed.summary ?? "").slice(0, 280),
      suggestion: String(parsed.suggestion ?? "").slice(0, 280),
      ...debugSpread,
    } as ReframeResponse);
  } catch (err: any) {
    console.error("Reframe API error:", err);
    if (err?.status === 401 || err?.code === "invalid_api_key") {
      return NextResponse.json(
        { error: "Invalid API key. Check OPENAI_API_KEY on the host." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: err?.message ?? "AI request failed" },
      { status: 502 }
    );
  }
}

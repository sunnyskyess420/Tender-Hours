import type OpenAI from "openai";

/**
 * Shared helpers for the AI endpoints.
 *
 * Why this exists: some providers truncate replies mid-sentence. With Gemini via
 * the OpenAI-compatible endpoint, a well-formed JSON reply was cut off at ~142
 * characters regardless of the token ceiling. A single JSON.parse() therefore
 * fails even though the model did the work correctly, and the feature looks
 * broken while the AI is actually fine.
 *
 * So: parse tolerantly, and if a reply stops mid-JSON, ask the model to continue
 * from where it stopped.
 */

export const AI_MAX_TOKENS = 900;
export const AI_MAX_ATTEMPTS = 3;

const CONTINUE_INSTRUCTION =
  "Your previous JSON was cut off. Output ONLY the remaining characters needed to complete it, starting exactly where you stopped. No repetition, no commentary, no code fences.";

export interface JsonRunResult<T> {
  value: T | null;
  raw: string;
  attempts: number;
}

export interface JsonRunOptions<T> {
  client: OpenAI;
  model: string;
  system: string;
  user: string;
  /** Return true once the parsed value has everything you actually need. */
  isComplete: (value: T) => boolean;
  /** Turn raw text into T, or null when impossible. */
  parse: (raw: string) => T | null;
  temperature?: number;
  maxTokens?: number;
  attempts?: number;
}

export async function runJsonTask<T>(opts: JsonRunOptions<T>): Promise<JsonRunResult<T>> {
  const maxAttempts = opts.attempts ?? AI_MAX_ATTEMPTS;
  const maxTokens = opts.maxTokens ?? AI_MAX_TOKENS;

  let raw = "";
  let value: T | null = null;
  let used = 0;

  for (let i = 0; i < maxAttempts; i++) {
    used = i + 1;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      i === 0
        ? [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ]
        : [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
            { role: "assistant", content: raw },
            { role: "user", content: CONTINUE_INSTRUCTION },
          ];

    const completion = await opts.client.chat.completions.create({
      model: opts.model,
      messages,
      temperature: i === 0 ? opts.temperature ?? 0.4 : 0,
      max_tokens: maxTokens,
    });

    const chunk = completion?.choices?.[0]?.message?.content ?? "";
    raw = i === 0 ? chunk : raw + chunk;

    value = opts.parse(raw);
    if (value && opts.isComplete(value)) break;
    if (!value) break;
  }

  return { value, raw, attempts: used };
}

/** First balanced { ... } block, ignoring braces inside string values. */
export function firstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
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
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Parse raw model text as JSON, tolerating fences and surrounding prose. */
export function parseJsonTolerant<T>(raw: string): T | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidates: string[] = [trimmed];

  const unfenced = trimmed
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  if (unfenced !== trimmed) candidates.push(unfenced);

  const block = firstJsonObject(trimmed);
  if (block) candidates.push(block);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed as T;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

/**
 * Read a single "key": "value" string out of text that may be truncated.
 * Returns null when the value itself was cut off.
 */
export function grabStringField(text: string, key: string): string | null {
  const marker = `"${key}"`;
  const at = text.indexOf(marker);
  if (at === -1) return null;

  let i = at + marker.length;
  while (i < text.length && (text[i] === " " || text[i] === ":" || text[i] === "\t")) i++;
  if (text[i] !== '"') return null;
  i++;

  let out = "";
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\") {
      const next = text[i + 1];
      if (next === undefined) return null;
      out += next === "n" ? "\n" : next;
      i += 2;
      continue;
    }
    if (ch === '"') return out;
    out += ch;
    i++;
  }
  return null;
}

/** Pull every COMPLETE quoted string out of a JSON array field. */
export function grabStringArray(text: string, key: string): string[] | null {
  const marker = `"${key}"`;
  const at = text.indexOf(marker);
  if (at === -1) return null;
  const open = text.indexOf("[", at);
  if (open === -1) return null;

  const out: string[] = [];
  let i = open + 1;

  while (i < text.length) {
    const ch = text[i];
    if (ch === "]") break;

    if (ch === '"') {
      let value = "";
      i++;
      let closed = false;
      while (i < text.length) {
        const c = text[i];
        if (c === "\\") {
          const next = text[i + 1];
          if (next === undefined) break;
          value += next === "n" ? "\n" : next;
          i += 2;
          continue;
        }
        if (c === '"') {
          closed = true;
          i++;
          break;
        }
        value += c;
        i++;
      }
      if (!closed) break; // truncated mid-item
      out.push(value);
      continue;
    }
    i++;
  }

  return out;
}

/** Pull every COMPLETE object out of a JSON array field. */
export function grabObjectArray<T = unknown>(text: string, key: string): T[] | null {
  const marker = `"${key}"`;
  const at = text.indexOf(marker);
  if (at === -1) return null;
  const open = text.indexOf("[", at);
  if (open === -1) return null;

  const items: T[] = [];
  let i = open + 1;
  let inString = false;
  let escaped = false;
  let depth = 0;
  let objStart = -1;

  for (; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && objStart !== -1) {
        try {
          items.push(JSON.parse(text.slice(objStart, i + 1)) as T);
        } catch {
          // skip a malformed item rather than losing the whole array
        }
        objStart = -1;
      }
    } else if (ch === "]" && depth === 0) {
      break;
    }
  }

  return items;
}

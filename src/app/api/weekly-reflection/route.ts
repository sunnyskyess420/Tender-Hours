// /api/weekly-reflection — generates a weekly reflection across the last 7
// days of journal entries, check-ins, and completed activities — all read
// straight from the app database.
//
// Body:  { memory: string }
// Resp:  { weekOf, patterns, moodSummary, topReframes, suggestion, generatedAt }
//
// Uses the OpenAI-compatible SDK with env vars. See /api/reframe/route.ts for
// supported providers and env var documentation.

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { db } from '@/lib/db'
import {
  grabObjectArray,
  grabStringArray,
  grabStringField,
  parseJsonTolerant,
  runJsonTask,
} from '@/lib/ai-json'

export const runtime = 'nodejs'

interface WeeklyParsed {
  patterns: string[]
  moodSummary: string
  topReframes: Array<{ pattern: string; count: number }>
  suggestion: string
}

export interface WeeklyReflection {
  weekOf: string
  patterns: string[]
  moodSummary: string
  topReframes: Array<{ pattern: string; count: number }>
  suggestion: string
  generatedAt: number
}

function getMondayLocal(ts: number): string {
  const d = new Date(ts)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  return localDayStr(monday)
}

function localDayStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
  })
}

function getModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o-mini'
}

/**
 * Turn the model's reply into a usable reflection.
 *
 * Falls back to salvaging whatever arrived complete when the reply was cut off
 * mid-JSON, so a truncated answer still yields usable content instead of an
 * error message.
 */
function parseWeekly(raw: string): WeeklyParsed | null {
  const obj = parseJsonTolerant<Partial<WeeklyParsed>>(raw)
  if (obj) {
    return {
      patterns: Array.isArray(obj.patterns) ? obj.patterns.map((p) => String(p)) : [],
      moodSummary: typeof obj.moodSummary === 'string' ? obj.moodSummary : '',
      topReframes: Array.isArray(obj.topReframes)
        ? (obj.topReframes as Array<{ pattern: string; count: number }>)
        : [],
      suggestion: typeof obj.suggestion === 'string' ? obj.suggestion : '',
    }
  }

  const patterns = grabStringArray(raw, 'patterns') ?? []
  const moodSummary = grabStringField(raw, 'moodSummary') ?? ''
  const suggestion = grabStringField(raw, 'suggestion') ?? ''
  const topReframes = grabObjectArray<{ pattern: string; count: number }>(raw, 'topReframes') ?? []

  if (patterns.length === 0 && !moodSummary && !suggestion) return null
  return { patterns, moodSummary, topReframes, suggestion }
}

// GET /api/weekly-reflection — saved reflections, most recent week first.
export async function GET() {
  const rows = await db.reflection.findMany({
    orderBy: [{ weekOf: 'desc' }, { generatedAt: 'desc' }],
  })
  const reflections: WeeklyReflection[] = []
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.payload) as Omit<WeeklyReflection, 'weekOf'>
      reflections.push({ weekOf: row.weekOf, ...parsed })
    } catch {
      // skip a malformed payload rather than losing the whole list
    }
  }
  return NextResponse.json({ reflections })
}

// POST /api/weekly-reflection — generate (or regenerate) this week's reflection.
export async function POST(req: NextRequest) {
  // Add ?debug=1 to include the raw model reply in the response.
  const wantsDebug = new URL(req.url).searchParams.get('debug') === '1'
  const client = getClient()
  if (!client) {
    return NextResponse.json(
      {
        error:
          "AI is not configured. Set the OPENAI_API_KEY environment variable on this app's host (or in .env locally).",
      },
      { status: 503 }
    )
  }

  let body: { memory?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const memory = (body.memory ?? '').trim()

  // ── Gather the past 7 days from the database ──────────────────────────────
  const now = Date.now()
  const cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000)

  const [journals, checkIns, activities] = await Promise.all([
    db.journalEntry.findMany({
      where: { createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'asc' },
    }),
    db.checkIn.findMany({ where: { createdAt: { gte: cutoff } } }),
    db.activity.findMany({
      where: {
        status: 'completed',
        isRecurrenceTemplate: false,
        date: { gte: localDayStr(cutoff) },
      },
    }),
  ])

  if (journals.length + checkIns.length + activities.length === 0) {
    return NextResponse.json(
      { error: 'Nothing to reflect on in the past 7 days yet. Write a journal entry or log a few activities first.' },
      { status: 400 }
    )
  }

  const moods = checkIns.filter((c) => c.kind === 'mood')
  const checks = checkIns.filter((c) => c.kind === 'healing')

  // ── Build the text summary ────────────────────────────────────────────────
  const summaryParts: string[] = []
  const flaggedCount = journals.filter((j) => {
    if (!j.reframeJson) return false
    try {
      return (JSON.parse(j.reframeJson) as { pattern?: string }).pattern !== 'none'
    } catch {
      return false
    }
  }).length

  summaryParts.push(`Journal entries: ${journals.length}${flaggedCount ? ` (${flaggedCount} with a pattern flagged)` : ''}`)

  summaryParts.push(`Mood logs: ${moods.length}`)
  if (moods.length > 0) {
    const moodLevels = moods.map((m) => Number(m.value ?? 0)).filter((l) => l > 0)
    if (moodLevels.length > 0) {
      const avg = (moodLevels.reduce((a, b) => a + b, 0) / moodLevels.length).toFixed(1)
      summaryParts.push(`Average mood level (1-5): ${avg}`)
    }
    const byDay: Record<string, number[]> = {}
    moods.forEach((m) => {
      const day = new Date(m.createdAt).toLocaleDateString([], { weekday: 'short' })
      if (!byDay[day]) byDay[day] = []
      byDay[day].push(Number(m.value ?? 0))
    })
    Object.entries(byDay).forEach(([day, levels]) => {
      const avg = (levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(1)
      summaryParts.push(`  ${day}: avg ${avg}`)
    })
  }

  summaryParts.push(`Healing checks: ${checks.length}`)
  if (checks.length > 0) {
    const yesCount = checks.filter((c) => c.value === 'yes').length
    const noCount = checks.filter((c) => c.value === 'no').length
    const skipCount = checks.filter((c) => c.value === 'skip').length
    summaryParts.push(`Healing check answers: ${yesCount} yes, ${noCount} no, ${skipCount} skip`)
  }

  if (activities.length > 0) {
    const totalMin = activities.reduce((sum, a) => sum + (a.durationMin ?? 0), 0)
    const byCategory: Record<string, number> = {}
    activities.forEach((a) => {
      byCategory[a.category] = (byCategory[a.category] ?? 0) + (a.durationMin ?? 0)
    })
    const impact: Record<string, number> = {}
    activities.forEach((a) => {
      if (a.healingImpact) impact[a.healingImpact] = (impact[a.healingImpact] ?? 0) + 1
    })
    summaryParts.push(`Completed activities: ${activities.length} · ${totalMin} minutes total`)
    const catLine = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, min]) => `${cat} ${min}m`)
      .join(', ')
    if (catLine) summaryParts.push(`  minutes by category: ${catLine}`)
    const impactLine = [
      impact['helped'] ? `moved toward healing ${impact['helped']}` : null,
      impact['neutral'] ? `neutral ${impact['neutral']}` : null,
      impact['hinder'] ? `held back ${impact['hinder']}` : null,
      impact['unsure'] ? `not sure ${impact['unsure']}` : null,
    ]
      .filter(Boolean)
      .join(' · ')
    if (impactLine) summaryParts.push(`  healing impact: ${impactLine}`)
  }

  if (journals.length > 0) {
    summaryParts.push('\nJournal excerpts:')
    journals.forEach((j) => {
      const date = new Date(j.createdAt).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
      const text = (j.text ?? '').slice(0, 280)
      let flagged = ''
      if (j.reframeJson) {
        try {
          const pattern = (JSON.parse(j.reframeJson) as { pattern?: string }).pattern
          if (pattern && pattern !== 'none') flagged = ` [flagged: ${pattern}]`
        } catch {
          // ignore
        }
      }
      summaryParts.push(`${date}${flagged}: ${text}`)
    })
  }

  const systemPrompt =
    memory ||
    `You are a gentle support tool for someone in BPD recovery, generating a one-paragraph weekly reflection. You are NOT a therapist. The user is reviewing their past week of journal entries, mood logs, healing-check answers, and completed activities. Your job is to help them see drift before it becomes crisis — without judgment, without imperative, without diagnostic language.

You MUST fill ALL fields. Never return an empty array or empty string for any field.

Output STRICT JSON only (no markdown fences, no prose outside JSON):
{
  "patterns": [<at least 1, up to 3 short observations, each a single sentence describing something you noticed in their week>],
  "moodSummary": "<one sentence describing the mood trends across the week — if you have mood data, mention the trend; if not, write 'Not enough mood data this week.'>",
  "topReframes": [{"pattern": "<pattern name>", "count": <number>}],
  "suggestion": "<one small thing to try next week — gentle, in the user's voice, no 'you should'. An observation or question often works better than a directive.>"
}

If there were no journal entries flagged for patterns, set topReframes to an empty array — that's the ONE exception.
ALL OTHER FIELDS MUST BE POPULATED with at least one item.

FORBIDDEN: "you should", "you must", "you need to", "your BPD", diagnostic language, medical advice, more than one suggestion, lists of demands.

Tone: warm, calm, short sentences. The suggestion should be one thing they could actually do or notice — not a regimen.`

  const userPrompt = `Here's the past week of my entries:

${summaryParts.join('\n')}

Generate my weekly reflection. Respond with JSON only.`

  try {
    const { value, raw, attempts } = await runJsonTask<WeeklyParsed>({
      client,
      model: getModel(),
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.5,
      // Useful once we have an observation and the suggestion.
      isComplete: (v) => v.patterns.length > 0 && v.suggestion.length > 0,
      parse: parseWeekly,
    })

    const debugPayload = wantsDebug
      ? { model: getModel(), rawLength: raw.length, attempts, raw: raw.slice(0, 1200) }
      : null
    const debugSpread = debugPayload ? { debug: debugPayload } : {}

    const weekOf = getMondayLocal(now)

    if (!value) {
      const excerpt = raw.slice(0, 300).replace(/\s+/g, ' ').trim()
      const fallback: WeeklyReflection = {
        weekOf,
        patterns: [
          `The AI replied in a format we couldn't read (${raw.length} chars). Raw start: ${excerpt || '(empty)'}`,
        ],
        moodSummary: '',
        topReframes: [],
        suggestion: '',
        generatedAt: Date.now(),
      }
      return NextResponse.json({ ...fallback, ...debugSpread })
    }

    // Sanitize and shape
    const reflection: WeeklyReflection = {
      weekOf,
      patterns: value.patterns.slice(0, 3).map((p) => String(p).slice(0, 300)),
      moodSummary: String(value.moodSummary ?? '').slice(0, 300),
      topReframes: value.topReframes.slice(0, 3).map((r) => ({
        pattern: String(r?.pattern ?? '').slice(0, 60),
        count: Math.max(1, Math.min(99, Number(r?.count ?? 1))),
      })),
      suggestion: String(value.suggestion ?? '').slice(0, 400),
      generatedAt: Date.now(),
    }

    // Save (one reflection per week; regenerate replaces it).
    const payload = JSON.stringify({
      patterns: reflection.patterns,
      moodSummary: reflection.moodSummary,
      topReframes: reflection.topReframes,
      suggestion: reflection.suggestion,
      generatedAt: reflection.generatedAt,
    })
    await db.reflection.upsert({
      where: { weekOf },
      create: { weekOf, payload },
      update: { payload, generatedAt: new Date(reflection.generatedAt) },
    })

    return NextResponse.json({ ...reflection, ...debugSpread })
  } catch (err: any) {
    console.error('Weekly reflection API error:', err)
    if (err?.status === 401 || err?.code === 'invalid_api_key') {
      return NextResponse.json(
        { error: 'Invalid API key. Check OPENAI_API_KEY on the host.' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: err?.message ?? 'AI request failed' },
      { status: 502 }
    )
  }
}

// Weekly reflection — client types and helpers.
// The reflection itself is generated server-side from the last 7 days of
// journal entries, check-ins and activities.

import { api } from './api'

export interface WeeklyReflection {
  weekOf: string // YYYY-MM-DD (Monday)
  patterns: string[]
  moodSummary: string
  topReframes: Array<{ pattern: string; count: number }>
  suggestion: string
  generatedAt: number
}

export async function listReflections(): Promise<WeeklyReflection[]> {
  const data = await api<{ reflections: WeeklyReflection[] }>('/api/weekly-reflection')
  return data.reflections
}

export interface GenerateResult {
  ok: boolean
  reflection: WeeklyReflection | null
  error?: string
}

/** Generate (or regenerate) this week's reflection. */
export async function generateReflection(memory: string): Promise<GenerateResult> {
  try {
    const res = await fetch('/api/weekly-reflection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memory }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, reflection: null, error: (data as any)?.error || `HTTP ${res.status}` }
    }
    return { ok: true, reflection: data as WeeklyReflection }
  } catch (e) {
    return { ok: false, reflection: null, error: e instanceof Error ? e.message : String(e) }
  }
}

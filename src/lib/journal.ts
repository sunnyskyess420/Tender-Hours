// Journal — client types and API helpers for the journal + AI reframe flow.
// Ported from Healing Companion; storage now lives in the app database.

import { api } from './api'

export type ReframeStatus = 'pending' | 'done' | 'error' | 'skipped'

export interface ReframeResult {
  pattern: string
  summary: string
  suggestion: string
  fetchedAt: number
}

export interface JournalEntry {
  id: string
  text: string
  /** JSON-encoded ReframeResult, or null (not scanned / no result yet). */
  reframeJson: string | null
  /** 'pending' | 'done' | 'error' | 'skipped' */
  reframeStatus: string
  reframeError: string | null
  createdAt: string
  updatedAt: string
}

export function parseReframe(entry: JournalEntry): ReframeResult | null {
  if (!entry.reframeJson) return null
  try {
    return JSON.parse(entry.reframeJson) as ReframeResult
  } catch {
    return null
  }
}

/** "all-or-nothing" -> "All or nothing" */
export function humanizePattern(p: string): string {
  if (!p) return ''
  const spaced = p.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

// ── API helpers ─────────────────────────────────────────────────────────────

export interface ApiResult<T> {
  ok: boolean
  status: number
  data: T | null
  error?: string
}

async function postJson<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, status: res.status, data: null, error: (data as any)?.error || `HTTP ${res.status}` }
    }
    return { ok: true, status: res.status, data: data as T }
  } catch (e) {
    return { ok: false, status: 0, data: null, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function listJournalEntries(): Promise<JournalEntry[]> {
  const data = await api<{ entries: JournalEntry[] }>('/api/journal?limit=50')
  return data.entries
}

export async function createJournalEntry(input: {
  text: string
  skipScan?: boolean
}): Promise<JournalEntry> {
  const data = await api<{ entry: JournalEntry }>('/api/journal', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.entry
}

export async function updateJournalEntry(
  id: string,
  patch: Partial<Pick<JournalEntry, 'reframeJson' | 'reframeStatus' | 'reframeError'>>
): Promise<JournalEntry> {
  const data = await api<{ entry: JournalEntry }>(`/api/journal/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return data.entry
}

export async function deleteJournalEntry(id: string): Promise<void> {
  await api(`/api/journal/${id}`, { method: 'DELETE' })
}

/** Ask the AI to scan an entry for thinking patterns. */
export async function postReframe(entry: string, memory: string): Promise<ApiResult<{
  pattern: string
  summary: string
  suggestion: string
}>> {
  return postJson('/api/reframe', { entry, memory })
}

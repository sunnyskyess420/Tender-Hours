// Check-ins — quick captures that live alongside activities: mood, healing
// check, and "I moved" logs. Ported from Healing Companion, stored in the
// app database via /api/checkins.

import { api } from './api'

export type CheckInKind = 'mood' | 'healing' | 'move'
export type HealingAnswer = 'yes' | 'no' | 'skip'

export interface CheckIn {
  id: string
  kind: CheckInKind
  value: string | null // mood: '1'..'5' · healing: 'yes'|'no'|'skip' · move: null
  note: string | null
  createdAt: string // ISO
}

export const MOOD_LABELS: Record<number, string> = {
  1: 'Very low',
  2: 'Low',
  3: 'Neutral',
  4: 'Okay',
  5: 'Good',
}

// ── Local mirror of the last "I moved" moment ──────────────────────────────
// The hourly move nudge re-derives its schedule from this mirror, so it keeps
// working instantly (and offline) without waiting on the database.
const LAST_MOVE_KEY = 'tender-hours:last-move'

export function getLastMoveAtLocal(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LAST_MOVE_KEY)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

export function markMovedLocally(ts: number = Date.now()) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LAST_MOVE_KEY, String(ts))
  } catch {
    // Private mode — the nudge falls back to its own cadence.
  }
}

// ── API helpers ────────────────────────────────────────────────────────────

export async function listCheckIns(): Promise<CheckIn[]> {
  const data = await api<{ checkIns: CheckIn[] }>('/api/checkins')
  return data.checkIns
}

export async function createCheckIn(input: {
  kind: CheckInKind
  value?: string | null
  note?: string | null
}): Promise<CheckIn> {
  const data = await api<{ checkIn: CheckIn }>('/api/checkins', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.checkIn
}

// ── Small helpers for counts ───────────────────────────────────────────────

/** Local (not UTC) YYYY-MM-DD key for an ISO timestamp. */
export function localDayKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function countToday(checkIns: CheckIn[], kind: CheckInKind): number {
  const today = localDayKey(new Date().toISOString())
  return checkIns.filter((c) => c.kind === kind && localDayKey(c.createdAt) === today).length
}

// Shared constants for Tender Hours — a gentle schedule for healing.

export type ActivityCategory =
  | 'movement'
  | 'mindfulness'
  | 'connection'
  | 'rest'
  | 'creativity'
  | 'learning'
  | 'therapy'
  | 'nutrition'
  | 'work'
  | 'other'

export type ActivityStatus = 'planned' | 'active' | 'completed' | 'skipped'

export type HealingImpact = 'helped' | 'neutral' | 'hinder' | 'unsure'

export interface Activity {
  id: string
  title: string
  notes: string | null
  category: string
  date: string // YYYY-MM-DD
  startTime: string // ISO
  endTime: string | null // ISO
  durationMin: number | null
  status: string
  healingImpact: string | null
  healingNote: string | null
  moodBefore: number | null
  moodAfter: number | null
  reminderMin: number | null
  reminderFired: boolean
  isRecurrenceTemplate: boolean
  recurrenceTemplateId: string | null
  recurrenceRule: string | null // JSON-encoded RecurrenceRule
  recurrenceExpandedThrough: string | null // YYYY-MM-DD
  createdAt: string
  updatedAt: string
}

// ── Recurrence ──────────────────────────────────────────────────────────────

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly'

export interface RecurrenceRule {
  freq: RecurrenceFreq
  interval: number // every N days/weeks/months
  weekdays?: number[] // 0=Sun … 6=Sat, used for weekly
  endDate?: string | null // YYYY-MM-DD when recurrence stops (inclusive)
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Quick preset options offered in the UI (the user can also pick "doesn't repeat").
export const RECURRENCE_PRESETS: { label: string; rule: RecurrenceRule | null }[] = [
  { label: 'Doesn’t repeat', rule: null },
  { label: 'Daily', rule: { freq: 'daily', interval: 1 } },
  { label: 'Weekdays (Mon–Fri)', rule: { freq: 'weekly', interval: 1, weekdays: [1, 2, 3, 4, 5] } },
  { label: 'Weekly', rule: { freq: 'weekly', interval: 1 } },
  { label: 'Every 2 weeks', rule: { freq: 'weekly', interval: 2 } },
  { label: 'Monthly', rule: { freq: 'monthly', interval: 1 } },
]

// Reminder presets shown as quick chips in the UI.
// value is minutes-before-startTime; null = no reminder.
export const REMINDER_PRESETS: { label: string; value: number | null }[] = [
  { label: 'No reminder', value: null },
  { label: 'At start', value: 0 },
  { label: '5 min before', value: 5 },
  { label: '10 min before', value: 10 },
  { label: '15 min before', value: 15 },
  { label: '30 min before', value: 30 },
  { label: '1 hour before', value: 60 },
]

// Human label, short label, emoji, and color token per category.
// Colors use Tailwind class names so the UI can style chips/badges directly.
export const CATEGORIES: Record<
  ActivityCategory,
  { label: string; short: string; emoji: string; chip: string; dot: string; ring: string }
> = {
  movement: {
    label: 'Movement',
    short: 'Move',
    emoji: '🚶',
    chip: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-400',
  },
  mindfulness: {
    label: 'Mindfulness',
    short: 'Mind',
    emoji: '🧘',
    chip: 'bg-violet-100 text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
    ring: 'ring-violet-400',
  },
  connection: {
    label: 'Connection',
    short: 'Connect',
    emoji: '💛',
    chip: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    ring: 'ring-amber-400',
  },
  rest: {
    label: 'Rest',
    short: 'Rest',
    emoji: '😴',
    chip: 'bg-sky-100 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
    ring: 'ring-sky-400',
  },
  creativity: {
    label: 'Creativity',
    short: 'Create',
    emoji: '🎨',
    chip: 'bg-rose-100 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    ring: 'ring-rose-400',
  },
  learning: {
    label: 'Learning',
    short: 'Learn',
    emoji: '📚',
    chip: 'bg-teal-100 text-teal-700 border-teal-200',
    dot: 'bg-teal-500',
    ring: 'ring-teal-400',
  },
  therapy: {
    label: 'Therapy',
    short: 'Therapy',
    emoji: '🫂',
    chip: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    dot: 'bg-fuchsia-500',
    ring: 'ring-fuchsia-400',
  },
  nutrition: {
    label: 'Nutrition',
    short: 'Food',
    emoji: '🥗',
    chip: 'bg-lime-100 text-lime-700 border-lime-200',
    dot: 'bg-lime-500',
    ring: 'ring-lime-400',
  },
  work: {
    label: 'Work',
    short: 'Work',
    emoji: '💼',
    chip: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
    ring: 'ring-slate-400',
  },
  other: {
    label: 'Other',
    short: 'Other',
    emoji: '✨',
    chip: 'bg-stone-100 text-stone-700 border-stone-200',
    dot: 'bg-stone-500',
    ring: 'ring-stone-400',
  },
}

export const CATEGORY_LIST = Object.keys(CATEGORIES) as ActivityCategory[]

export const HEALING_IMPACT: Record<
  HealingImpact,
  { label: string; emoji: string; chip: string; value: string }
> = {
  helped: {
    label: 'Moved me toward healing',
    emoji: '🌱',
    chip: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    value: 'helped',
  },
  neutral: {
    label: 'Neutral',
    emoji: '😐',
    chip: 'bg-stone-100 text-stone-600 border-stone-300',
    value: 'neutral',
  },
  hinder: {
    label: 'Held me back',
    emoji: '⚠️',
    chip: 'bg-rose-100 text-rose-700 border-rose-300',
    value: 'hinder',
  },
  unsure: {
    label: 'Not sure yet',
    emoji: '🤔',
    chip: 'bg-slate-100 text-slate-600 border-slate-300',
    value: 'unsure',
  },
}

export const HEALING_IMPACT_LIST = Object.keys(HEALING_IMPACT) as HealingImpact[]

export const STATUS_LABELS: Record<ActivityStatus, { label: string; chip: string }> = {
  planned: { label: 'Planned', chip: 'bg-sky-100 text-sky-700 border-sky-200' },
  active: { label: 'In progress', chip: 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse' },
  completed: { label: 'Done', chip: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  skipped: { label: 'Skipped', chip: 'bg-stone-100 text-stone-500 border-stone-200' },
}

// ── Time helpers ─────────────────────────────────────────────────────────────

export function todayISODate(): string {
  // YYYY-MM-DD in local timezone
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function isoFromLocal(date: string, timeHHMM: string): string {
  // date: YYYY-MM-DD, timeHHMM: HH:MM (24h, local) → ISO
  const [h, m] = timeHHMM.split(':').map(Number)
  const d = new Date(`${date}T00:00:00`)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export function timeHHMMFromISO(iso: string): string {
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 min'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function minutesBetween(startISO: string, endISO: string): number {
  const start = new Date(startISO).getTime()
  const end = new Date(endISO).getTime()
  return Math.max(0, Math.round((end - start) / 60000))
}

export function formatPrettyDate(dateStr: string): string {
  // dateStr: YYYY-MM-DD
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function shortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export function isToday(dateStr: string): boolean {
  return dateStr === todayISODate()
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + n)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function relativeDayLabel(dateStr: string): string {
  const today = todayISODate()
  if (dateStr === today) return 'Today'
  if (dateStr === addDays(today, 1)) return 'Tomorrow'
  if (dateStr === addDays(today, -1)) return 'Yesterday'
  return shortDate(dateStr)
}

// ── Recurrence helpers ──────────────────────────────────────────────────────

/**
 * Given a RecurrenceRule and a start date (YYYY-MM-DD), compute all occurrence
 * dates between `fromDate` (inclusive) and `throughDate` (inclusive).
 *
 * Strategy:
 *  - daily: every `interval` days from startDate
 *  - weekly:
 *      if weekdays specified → only those weekdays, ignoring interval
 *      else → every `interval` weeks from startDate
 *  - monthly: same day-of-month each `interval` months (clamp to last day if
 *      the target month doesn't have that day, e.g. Jan 31 → Feb 28)
 *
 * Stops at endDate if the rule has one.
 */
export function expandRecurrence(
  rule: RecurrenceRule,
  startDate: string, // YYYY-MM-DD
  fromDate: string, // YYYY-MM-DD, inclusive
  throughDate: string // YYYY-MM-DD, inclusive
): string[] {
  const out: string[] = []
  const start = parseDate(startDate)
  const from = parseDate(fromDate)
  const through = parseDate(throughDate)
  const end = rule.endDate ? parseDate(rule.endDate) : null

  if (through < from) return out
  if (end && from > end) return out

  const interval = Math.max(1, rule.interval)

  if (rule.freq === 'daily') {
    let d = new Date(start)
    // Advance to the first occurrence >= from
    while (d < from) d.setDate(d.getDate() + interval)
    while (d <= through) {
      if (end && d > end) break
      if (d >= from) out.push(formatYMD(d))
      d.setDate(d.getDate() + interval)
    }
    return out
  }

  if (rule.freq === 'weekly') {
    if (rule.weekdays && rule.weekdays.length > 0) {
      // Ignore interval; just emit matching weekdays.
      const wd = new Set(rule.weekdays)
      let d = new Date(from)
      while (d <= through) {
        if (end && d > end) break
        if (d >= start && wd.has(d.getDay())) out.push(formatYMD(d))
        d.setDate(d.getDate() + 1)
      }
      return out
    }
    // No weekdays specified → every `interval` weeks from start
    let d = new Date(start)
    while (d < from) d.setDate(d.getDate() + 7 * interval)
    while (d <= through) {
      if (end && d > end) break
      if (d >= from) out.push(formatYMD(d))
      d.setDate(d.getDate() + 7 * interval)
    }
    return out
  }

  if (rule.freq === 'monthly') {
    let d = new Date(start)
    // Advance to first occurrence >= from
    while (d < from) {
      d.setMonth(d.getMonth() + interval)
    }
    while (d <= through) {
      if (end && d > end) break
      if (d >= from) out.push(formatYMD(d))
      d.setMonth(d.getMonth() + interval)
    }
    return out
  }

  return out
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function formatYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Encode/decode a RecurrenceRule to/from JSON string (stored in DB).
export function encodeRule(rule: RecurrenceRule | null): string | null {
  if (!rule) return null
  return JSON.stringify(rule)
}
export function decodeRule(s: string | null): RecurrenceRule | null {
  if (!s) return null
  try {
    return JSON.parse(s) as RecurrenceRule
  } catch {
    return null
  }
}

// Human description for display, e.g. "Weekly on Mon, Wed" or "Daily"
export function describeRule(rule: RecurrenceRule | null): string {
  if (!rule) return 'One time'
  if (rule.freq === 'daily') {
    return rule.interval === 1 ? 'Daily' : `Every ${rule.interval} days`
  }
  if (rule.freq === 'weekly') {
    if (rule.weekdays && rule.weekdays.length > 0) {
      const days = rule.weekdays
        .slice()
        .sort((a, b) => a - b)
        .map((d) => WEEKDAY_LABELS[d])
        .join(', ')
      return `Weekly on ${days}`
    }
    return rule.interval === 1 ? 'Weekly' : `Every ${rule.interval} weeks`
  }
  if (rule.freq === 'monthly') {
    return rule.interval === 1 ? 'Monthly' : `Every ${rule.interval} months`
  }
  return 'Repeats'
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, formatTime, minutesBetween } from '@/lib/healing'

// ─── Types ──────────────────────────────────────────────────────────────────

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export interface PendingReminder {
  id: string // activity id, used as a stable key
  activity: Activity
  firedAt: number // ms epoch
  snoozedUntil: number | null // ms epoch, if snoozed
  dismissed: boolean
}

export interface DailyCheckInSettings {
  enabled: boolean
  time: string // "HH:MM" in local time
  lastFiredDate: string | null // "YYYY-MM-DD" so we fire at most once per day
}

export interface EndOfDaySettings {
  enabled: boolean
  time: string // "HH:MM" in local time
  lastFiredDate: string | null // "YYYY-MM-DD" so we fire at most once per day
}

// ─── localStorage keys ────────────────────────────────────────────────────────

const LS_FIRED_KEY = 'healing:firedReminderIds' // legacy: array of activity ids
const LS_SNOOZED_KEY = 'healing:snoozedReminders' // { [id]: msEpoch }
const LS_DAILY_KEY = 'tender:dailyCheckIn' // DailyCheckInSettings JSON
const LS_EOD_KEY = 'tender:endOfDay' // EndOfDaySettings JSON

// ─── Helpers ────────────────────────────────────────────────────────────────

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJSON<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota errors
  }
}

function todayDateStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReminders() {
  const [permission, setPermission] = useState<NotificationPermissionState>('default')
  const [pending, setPending] = useState<PendingReminder[]>([])
  const [daily, setDaily] = useState<DailyCheckInSettings>({
    enabled: false,
    time: '09:00',
    lastFiredDate: null,
  })
  const [eod, setEod] = useState<EndOfDaySettings>({
    enabled: false,
    time: '21:00',
    lastFiredDate: null,
  })
  const [eodOpen, setEodOpen] = useState(false)

  // In-memory set of activity IDs whose notification we've already sent this session,
  // so a re-render doesn't fire the same notification twice.
  const firedThisSession = useRef<Set<string>>(new Set())

  // ─── Initialise state from the browser ──────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission as NotificationPermissionState)
    setDaily(
      readJSON<DailyCheckInSettings>(LS_DAILY_KEY, {
        enabled: false,
        time: '09:00',
        lastFiredDate: null,
      })
    )
    setEod(
      readJSON<EndOfDaySettings>(LS_EOD_KEY, {
        enabled: false,
        time: '21:00',
        lastFiredDate: null,
      })
    )
    setPending(readJSON<PendingReminder[]>(LS_FIRED_KEY, []).map(() => ({ /* placeholder */ } as PendingReminder)).filter(Boolean))
  }, [])

  // Persist pending reminders & daily/EOD settings whenever they change
  useEffect(() => {
    writeJSON(LS_SNOOZED_KEY, Object.fromEntries(pending.map((p) => [p.id, p.snoozedUntil])))
  }, [pending])
  useEffect(() => {
    writeJSON(LS_DAILY_KEY, daily)
  }, [daily])
  useEffect(() => {
    writeJSON(LS_EOD_KEY, eod)
  }, [eod])

  // ─── Request permission ────────────────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported')
      return 'unsupported' as NotificationPermissionState
    }
    try {
      const result = await Notification.requestPermission()
      setPermission(result as NotificationPermissionState)
      if (result === 'granted') {
        // Fire a tiny "you're set" notification so they know it works
        try {
          new Notification('Reminders are on', {
            body: 'Healing Companion will gently nudge you before each scheduled activity.',
            icon: '/logo.svg',
          })
        } catch {
          // Some browsers throw if icon is missing — fine.
        }
      }
      return result as NotificationPermissionState
    } catch {
      setPermission('denied')
      return 'denied' as NotificationPermissionState
    }
  }, [])

  // ─── Fire a notification for an activity ───────────────────────────────────
  const fireNotification = useCallback(
    (a: Activity) => {
      if (firedThisSession.current.has(a.id)) return
      firedThisSession.current.add(a.id)

      const startMs = new Date(a.startTime).getTime()
      const minsToStart = Math.round((startMs - Date.now()) / 60000)
      const body =
        minsToStart > 0
          ? `Starting in ${minsToStart} min: ${formatTime(a.startTime)}`
          : `Starting now · ${formatTime(a.startTime)}`

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const n = new Notification(`🌱 ${a.title}`, {
            body,
            icon: '/logo.svg',
            tag: `reminder-${a.id}`,
            requireInteraction: true, // stay until the user dismisses
          })
          n.onclick = () => {
            window.focus()
            n.close()
          }
        } catch {
          // silently ignore — the in-app banner is the fallback
        }
      }

      // Always add to the in-app pending list (works even without permission)
      setPending((cur) => {
        const without = cur.filter((p) => p.id !== a.id)
        return [
          ...without,
          {
            id: a.id,
            activity: a,
            firedAt: Date.now(),
            snoozedUntil: null,
            dismissed: false,
          },
        ]
      })

      // Tell the server this reminder has fired so it doesn't keep appearing
      fetch(`/api/activities/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderFired: true }),
      }).catch(() => {})
    },
    []
  )

  // ─── Poll for due reminders every 20 seconds ─────────────────────────────────
  useEffect(() => {
    let stop = false
    async function check() {
      if (stop) return
      try {
        const res = await fetch('/api/activities?remindersDue=1')
        if (!res.ok) return
        const data = (await res.json()) as { activities: Activity[] }
        for (const a of data.activities) {
          fireNotification(a)
        }
      } catch {
        // ignore — try again next tick
      }
    }
    check()
    const interval = setInterval(check, 20000)
    return () => {
      stop = true
      clearInterval(interval)
    }
  }, [fireNotification])

  // ─── Daily check-in reminder ─────────────────────────────────────────────────
  useEffect(() => {
    if (!daily.enabled) return
    const interval = setInterval(() => {
      const now = new Date()
      const [h, m] = daily.time.split(':').map(Number)
      const target = new Date()
      target.setHours(h, m, 0, 0)
      // Fire if we're within 60 seconds past the target time and haven't fired today.
      const today = todayDateStr()
      if (
        now.getTime() >= target.getTime() &&
        now.getTime() - target.getTime() < 60000 &&
        daily.lastFiredDate !== today
      ) {
        setDaily((d) => ({ ...d, lastFiredDate: today }))
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('🌱 Daily check-in', {
              body: 'How are you starting today? Log your first activity when you’re ready.',
              icon: '/logo.svg',
            })
          } catch {}
        }
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [daily.enabled, daily.time, daily.lastFiredDate])

  // ─── End-of-day reflection reminder ─────────────────────────────────────────
  // When the configured time hits, fire a notification AND open the reflection
  // modal (via setEodOpen(true)).
  useEffect(() => {
    if (!eod.enabled) return
    const interval = setInterval(() => {
      const now = new Date()
      const [h, m] = eod.time.split(':').map(Number)
      const target = new Date()
      target.setHours(h, m, 0, 0)
      const today = todayDateStr()
      if (
        now.getTime() >= target.getTime() &&
        now.getTime() - target.getTime() < 60000 &&
        eod.lastFiredDate !== today
      ) {
        setEod((d) => ({ ...d, lastFiredDate: today }))
        setEodOpen(true)
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('🌙 End-of-day reflection', {
              body: 'A gentle moment to look back on today. Tap to reflect.',
              icon: '/logo.svg',
              requireInteraction: true,
            })
          } catch {}
        }
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [eod.enabled, eod.time, eod.lastFiredDate])

  // ─── Snooze / dismiss / start ────────────────────────────────────────────────
  const snooze = useCallback((id: string, minutes: number) => {
    setPending((cur) =>
      cur.map((p) =>
        p.id === id
          ? { ...p, snoozedUntil: Date.now() + minutes * 60000 }
          : p
      )
    )
    // Also un-fire on the server so the polling loop re-fires it later if needed.
    // Actually: snooze is purely client-side for now — server stays fired=true so we
    // don't re-blast. The snoozed item pops back into the banner after snoozeUntil.
  }, [])

  const dismiss = useCallback((id: string) => {
    setPending((cur) => cur.map((p) => (p.id === id ? { ...p, dismissed: true } : p)))
  }, [])

  const dismissAll = useCallback(() => {
    setPending((cur) => cur.map((p) => ({ ...p, dismissed: true })))
  }, [])

  // Re-show snoozed reminders when their time comes
  useEffect(() => {
    const t = setInterval(() => {
      setPending((cur) => {
        let changed = false
        const next = cur.map((p) => {
          if (p.snoozedUntil && Date.now() >= p.snoozedUntil) {
            changed = true
            return { ...p, snoozedUntil: null }
          }
          return p
        })
        return changed ? next : cur
      })
    }, 5000)
    return () => clearInterval(t)
  }, [])

  // ─── Daily check-in & EOD setters ───────────────────────────────────────────
  const setDailyCheckIn = useCallback((settings: Partial<DailyCheckInSettings>) => {
    setDaily((d) => ({ ...d, ...settings }))
  }, [])
  const setEndOfDay = useCallback((settings: Partial<EndOfDaySettings>) => {
    setEod((d) => ({ ...d, ...settings }))
  }, [])
  // Allow manual trigger of the EOD modal from anywhere
  const openEodModal = useCallback(() => setEodOpen(true), [])
  const closeEodModal = useCallback(() => setEodOpen(false), [])

  // Visible pending = not dismissed, not currently snoozed
  const visiblePending = pending.filter(
    (p) => !p.dismissed && (p.snoozedUntil === null || Date.now() >= p.snoozedUntil)
  )

  return {
    permission,
    requestPermission,
    pending: visiblePending,
    snooze,
    dismiss,
    dismissAll,
    daily,
    setDailyCheckIn,
    eod,
    setEndOfDay,
    eodOpen,
    openEodModal,
    closeEodModal,
  }
}

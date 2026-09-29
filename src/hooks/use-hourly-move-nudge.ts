'use client'

// Hourly "time to move" nudges — ported from Healing Companion.
//
// The nudge re-derives its due time from the last logged move (plus its own
// last firing) on every tick, so it survives background tabs, sleep, reloads
// and multiple open tabs. Reminders fire while the app has an open tab; on
// browsers that support periodic background sync it can also chip in from the
// background — there is no push server by design.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { getLastMoveAtLocal } from '@/lib/checkins'
import { playChime } from '@/lib/chime'

export const HOURLY_MS = 60 * 60 * 1000
export const MOVE_NUDGE_BODY =
  'Time to move. Stand up, stretch, walk to the window. One minute is enough.'

export type ReminderActionResult =
  | { ok: true }
  | { ok: false; reason: string; detail?: string }

/** Timestamp of the last notification actually shown. */
const LAST_NUDGE_KEY = 'tender-hours:nudge:last-fired'
/** Timestamp of the last time the hourly window advanced. */
const WINDOW_KEY = 'tender-hours:nudge:window'
const ANCHOR_KEY = 'tender-hours:nudge:anchor'
const PERMISSION_EVENT = 'tender-hours:permission-changed'
const TICK_MS = 30_000
const PERIODIC_SYNC_TAG = 'hourly-move'

export type ReminderPermission = 'default' | 'granted' | 'denied'

/**
 * `vibrate` is part of the Notifications spec and is honoured by the browsers
 * we target, but it is missing from this project's TypeScript DOM lib. It is
 * declared explicitly here instead of casting at every call site.
 */
export type MoveNotificationOptions = NotificationOptions & {
  vibrate?: number[]
}

export function moveNotificationOptions(body: string): MoveNotificationOptions {
  return {
    body,
    icon: '/icon-192.png',
    tag: 'hourly-move',
    vibrate: [80, 40, 80],
    requireInteraction: true,
    data: { source: 'reminder' },
  }
}

export interface HourlyMoveNudgeState {
  /** `null` until the client has checked (server render / hydration). */
  supported: boolean | null
  permission: ReminderPermission
  /** Epoch ms of the next scheduled nudge, or null when nudges are off. */
  nextDueAt: number | null
  /** Epoch ms of the last nudge actually shown. */
  lastFiredAt: number | null
  /** Fire a notification right now, without touching the hourly cadence. */
  testNow: () => Promise<ReminderActionResult>
  /** Re-read the browser permission. Call after requestPermission() resolves. */
  refreshPermission: () => void
}

// ---------------------------------------------------------------------------
// Notification permission, exposed as an external store so the component never
// has to setState from inside an effect.
// ---------------------------------------------------------------------------

function getSupportedSnapshot(): boolean | null {
  if (typeof window === 'undefined') return null
  return 'Notification' in window
}

function getSupportedServerSnapshot(): boolean | null {
  return null
}

function getPermissionSnapshot(): ReminderPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'default'
  return Notification.permission as ReminderPermission
}

function getPermissionServerSnapshot(): ReminderPermission {
  return 'default'
}

function subscribeToPermission(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  let status: PermissionStatus | null = null
  let disposed = false

  const query = navigator.permissions?.query?.({ name: 'notifications' as PermissionName })
  if (query) {
    query
      .then((s) => {
        if (disposed) return
        status = s
        s.addEventListener('change', onStoreChange)
      })
      .catch(() => {
        // Older Safari: the focus / visibility listeners below still re-read
        // the snapshot, so the UI stays honest even without the change event.
      })
  }

  window.addEventListener('focus', onStoreChange)
  window.addEventListener(PERMISSION_EVENT, onStoreChange)
  document.addEventListener('visibilitychange', onStoreChange)

  return () => {
    disposed = true
    if (status) status.removeEventListener('change', onStoreChange)
    window.removeEventListener('focus', onStoreChange)
    window.removeEventListener(PERMISSION_EVENT, onStoreChange)
    document.removeEventListener('visibilitychange', onStoreChange)
  }
}

function notifyPermissionChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(PERMISSION_EVENT))
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function readStoredNumber(key: string): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

function writeStoredNumber(key: string, value: number) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    // Private mode or quota. Nudges still fire, they just cannot de-dupe.
  }
}

// ---------------------------------------------------------------------------
// Notification delivery
// ---------------------------------------------------------------------------

type NotifyOutcome = { ok: true } | { ok: false; detail: string }

/**
 * Show a nudge — via the service worker when there is one, and the page-level
 * API otherwise. Every notification path goes through here, so the test nudge
 * is a genuine rehearsal of the real one.
 */
async function showAppNotification(body: string, tag: string): Promise<NotifyOutcome> {
  let swError: unknown = null

  try {
    const reg = await navigator.serviceWorker?.getRegistration?.()
    if (reg && 'showNotification' in reg) {
      await reg.showNotification('Tender Hours', {
        ...moveNotificationOptions(body),
        tag,
      })
      return { ok: true }
    }
  } catch (e) {
    swError = e
  }

  try {
    new Notification('Tender Hours', { ...moveNotificationOptions(body), tag })
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      detail: `serviceWorker: ${
        swError instanceof Error ? swError.message : String(swError ?? 'n/a')
      }; Notification: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}

async function showNudge(body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return

  // The chime is the only part of the sound the app controls; the notification
  // itself uses whatever the operating system plays. Fired first so it is not
  // delayed behind the service-worker call.
  playChime()

  await showAppNotification(body, 'hourly-move')
}

async function registerPeriodicSync() {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const reg = (await navigator.serviceWorker.getRegistration?.()) as
      | (ServiceWorkerRegistration & {
          periodicSync?: {
            register: (tag: string, options: { minInterval: number }) => Promise<void>
          }
        })
      | undefined

    if (!reg || !reg.periodicSync) return
    await reg.periodicSync.register(PERIODIC_SYNC_TAG, { minInterval: HOURLY_MS })
  } catch {
    // Unsupported, not installed, or no permission. Best effort only.
  }
}

// ---------------------------------------------------------------------------
// The hook
// ---------------------------------------------------------------------------

export function useHourlyMoveNudge(opts: {
  enabled: boolean
  onFire?: () => void
}): HourlyMoveNudgeState {
  const { enabled } = opts

  // The onFire callback lives in a ref, updated in an effect rather than
  // during render.
  const onFireRef = useRef<(() => void) | undefined>(opts.onFire)

  const supported = useSyncExternalStore(
    subscribeToPermission,
    getSupportedSnapshot,
    getSupportedServerSnapshot
  )
  const permission = useSyncExternalStore(
    subscribeToPermission,
    getPermissionSnapshot,
    getPermissionServerSnapshot
  )

  const [nextDueAt, setNextDueAt] = useState<number | null>(null)
  const [lastFiredAt, setLastFiredAt] = useState<number | null>(null)

  useEffect(() => {
    onFireRef.current = opts.onFire
  }, [opts.onFire])

  const refreshPermission = useCallback(() => {
    notifyPermissionChanged()
  }, [])

  const active = enabled && supported === true && permission === 'granted'

  // The nudge engine. Runs only while nudges are actually live; the returned
  // `nextDueAt` is nulled out below when they are not.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!active) return

    let cancelled = false
    const armedAt = Date.now()

    // First time nudges are switched on: remember it, so the cadence survives
    // reloads even before a move is logged or a nudge fires.
    if (readStoredNumber(ANCHOR_KEY) === null) writeStoredNumber(ANCHOR_KEY, armedAt)

    // Latest of: last move, last nudge, when nudges were first switched on.
    const baseline = () => {
      const candidates = [
        getLastMoveAtLocal(),
        readStoredNumber(LAST_NUDGE_KEY),
        readStoredNumber(WINDOW_KEY),
        readStoredNumber(ANCHOR_KEY),
      ].filter((n): n is number => typeof n === 'number')
      return candidates.length > 0 ? Math.max(...candidates) : armedAt
    }

    const fire = async () => {
      const now = Date.now()
      const lastNudge = readStoredNumber(LAST_NUDGE_KEY)
      // Another tab, or an earlier tick, already handled this hour.
      if (lastNudge !== null && now - lastNudge < HOURLY_MS) return
      writeStoredNumber(LAST_NUDGE_KEY, now)
      writeStoredNumber(WINDOW_KEY, now)
      setLastFiredAt(now)
      setNextDueAt(now + HOURLY_MS)
      await showNudge(MOVE_NUDGE_BODY)
      if (!cancelled) onFireRef.current?.()
    }

    const tick = () => {
      if (cancelled) return
      setLastFiredAt(readStoredNumber(LAST_NUDGE_KEY))

      const now = Date.now()
      const due = baseline() + HOURLY_MS
      setNextDueAt(due)
      if (now < due) return
      void fire()
    }

    tick()
    const id = window.setInterval(tick, TICK_MS)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    void registerPeriodicSync()

    return () => {
      cancelled = true
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [active])

  const testNow = useCallback(async (): Promise<ReminderActionResult> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { ok: false, reason: 'This browser cannot show notifications.' }
    }
    if (Notification.permission !== 'granted') {
      return { ok: false, reason: 'Notifications are not allowed yet.' }
    }

    const body = 'Test nudge. This is what your hourly move reminder will look like.'

    // Exactly the path a real nudge takes, chime included. Its own tag, so it
    // never replaces the hourly nudge.
    playChime()
    const outcome = await showAppNotification(body, 'test-nudge')

    return outcome.ok
      ? { ok: true }
      : {
          ok: false,
          reason: 'Your browser refused to show a notification.',
          detail: outcome.detail,
        }
  }, [])

  return {
    supported,
    permission,
    nextDueAt: active ? nextDueAt : null,
    lastFiredAt,
    testNow,
    refreshPermission,
  }
}

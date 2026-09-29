'use client'

// Check-in section — ported from Healing Companion and wired to the Tender
// Hours database: mood logs, the therapist's healing check, and "I moved"
// logs, plus the hourly move nudge controls.

import { useCallback, useEffect, useState } from 'react'
import { Bell, Check, ChevronRight, Footprints, HeartPulse, Plus, SkipForward, Smile, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  CheckIn,
  MOOD_LABELS,
  countToday,
  createCheckIn,
  listCheckIns,
  markMovedLocally,
} from '@/lib/checkins'
import { useHourlyMoveNudge } from '@/hooks/use-hourly-move-nudge'

const NUDGE_PREF_KEY = 'tender-hours:nudge:enabled'

const inputCls =
  'w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none'

function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
      {icon}
      {title}
    </h3>
  )
}

export function CheckInSection() {
  const { toast } = useToast()
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [moodOpen, setMoodOpen] = useState(false)
  const [healingOpen, setHealingOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Mood sheet state
  const [moodValue, setMoodValue] = useState<number | null>(null)
  const [moodNote, setMoodNote] = useState('')
  // Healing check state
  const [healingNote, setHealingNote] = useState('')

  // Nudge preference + engine
  const [nudgeEnabled, setNudgeEnabled] = useState(false)
  const nudge = useHourlyMoveNudge({
    enabled: nudgeEnabled,
    onFire: () =>
      toast({ title: 'Time to move', description: 'One minute is enough.' }),
  })

  const load = useCallback(async () => {
    try {
      setCheckIns(await listCheckIns())
    } catch (e) {
      console.error('could not load check-ins', e)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Read the nudge preference after mount (localStorage is browser-only).
  useEffect(() => {
    try {
      setNudgeEnabled(window.localStorage.getItem(NUDGE_PREF_KEY) === 'on')
    } catch {
      // ignore
    }
  }, [])

  const setNudge = useCallback((on: boolean) => {
    setNudgeEnabled(on)
    try {
      window.localStorage.setItem(NUDGE_PREF_KEY, on ? 'on' : 'off')
    } catch {
      // ignore
    }
  }, [])

  const moodCount = countToday(checkIns, 'mood')
  const healingCount = countToday(checkIns, 'healing')
  const moveCount = countToday(checkIns, 'move')

  // ── Actions ───────────────────────────────────────────────────────────────

  async function saveMood() {
    if (!moodValue || saving) return
    setSaving(true)
    try {
      await createCheckIn({
        kind: 'mood',
        value: String(moodValue),
        note: moodNote.trim() || null,
      })
      toast({ title: 'Mood saved', description: 'Thanks for checking in.' })
      setMoodValue(null)
      setMoodNote('')
      setMoodOpen(false)
      void load()
    } catch (e) {
      console.error(e)
      toast({ title: 'Could not save', description: 'Try again in a moment.' })
    } finally {
      setSaving(false)
    }
  }

  async function saveHealing(answer: 'yes' | 'no' | 'skip') {
    if (saving) return
    setSaving(true)
    try {
      await createCheckIn({
        kind: 'healing',
        value: answer,
        note: healingNote.trim() || null,
      })
      toast({
        title: answer === 'skip' ? 'Skipped — that counts too' : 'Check-in saved',
      })
      setHealingNote('')
      setHealingOpen(false)
      void load()
    } catch (e) {
      console.error(e)
      toast({ title: 'Could not save', description: 'Try again in a moment.' })
    } finally {
      setSaving(false)
    }
  }

  async function logMove() {
    // Mirror locally right away — this resets the hourly nudge cadence.
    markMovedLocally()
    const optimistic: CheckIn = {
      id: `local-${Date.now()}`,
      kind: 'move',
      value: null,
      note: null,
      createdAt: new Date().toISOString(),
    }
    setCheckIns((prev) => [optimistic, ...prev])
    try {
      await createCheckIn({ kind: 'move' })
      toast({ title: 'Moved — nice.', description: 'One minute counts.' })
      void load()
    } catch (e) {
      console.error(e)
      toast({
        title: 'Saved on this device',
        description: 'The server was unreachable — the nudge timer still reset.',
      })
    }
  }

  async function enableNotifications() {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    try {
      const result = await Notification.requestPermission()
      nudge.refreshPermission()
      if (result === 'granted') {
        setNudge(true)
        toast({ title: 'Notifications on', description: 'Nudges can reach you now.' })
      }
    } catch {
      // ignore
    }
  }

  async function testNudge() {
    const result = await nudge.testNow()
    if (result.ok) {
      toast({ title: 'Test nudge sent', description: 'This is what a nudge looks like.' })
    } else {
      toast({ title: 'Could not send it', description: result.reason })
    }
  }

  // ── Nudge status copy ─────────────────────────────────────────────────────

  let nudgeStatus: string
  if (nudge.supported === false) {
    nudgeStatus = 'Not supported in this browser.'
  } else if (nudge.permission === 'denied') {
    nudgeStatus = 'Blocked by the browser — allow notifications to switch this on.'
  } else if (nudge.permission === 'default') {
    nudgeStatus = 'Turn on notifications to get nudged each hour.'
  } else {
    nudgeStatus = nudgeEnabled
      ? "On — a gentle nudge every hour, while you're around."
      : 'Off — a gentle nudge to move, once an hour.'
  }

  return (
    <>
      <section>
        <SectionHeading icon={<Smile className="w-4 h-4" />} title="Check in" />
        <div className="space-y-2">
          {/* Mood */}
          <button
            onClick={() => setMoodOpen(true)}
            className="w-full flex items-center gap-3 rounded-2xl border border-stone-200/60 bg-white p-4 text-left transition hover:bg-emerald-50/50"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Smile className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800">Log how I feel</p>
              <p className="text-xs text-stone-500">
                {moodCount === 0 ? 'Not logged yet today' : `${moodCount} today`}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-300 shrink-0" />
          </button>

          {/* Healing check */}
          <button
            onClick={() => setHealingOpen(true)}
            className="w-full flex items-center gap-3 rounded-2xl border border-stone-200/60 bg-white p-4 text-left transition hover:bg-emerald-50/50"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800">Quick healing check</p>
              <p className="text-xs text-stone-500">
                {healingCount === 0 ? 'Ask yourself once' : `${healingCount} today`}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-300 shrink-0" />
          </button>

          {/* I moved */}
          <button
            onClick={logMove}
            className="w-full flex items-center gap-3 rounded-2xl border border-stone-200/60 bg-white p-4 text-left transition hover:bg-emerald-50/50"
          >
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
              <Footprints className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800">I moved</p>
              <p className="text-xs text-stone-500">
                {moveCount === 0 ? 'First one today' : `${moveCount} today`}
              </p>
            </div>
            <Plus className="w-4 h-4 text-stone-300 shrink-0" />
          </button>
        </div>
      </section>

      {/* ── Move nudge ───────────────────────────────────────────────────── */}
      <section>
        <SectionHeading icon={<Bell className="w-4 h-4" />} title="Move nudge" />
        <div className="rounded-2xl border border-stone-200/60 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800">Hourly move nudge</p>
              <p className="text-xs text-stone-500 mt-0.5">{nudgeStatus}</p>
            </div>
            {nudge.supported !== false && nudge.permission === 'granted' && (
              <button
                onClick={() => setNudge(!nudgeEnabled)}
                className={`relative w-11 h-6 rounded-full transition shrink-0 ${
                  nudgeEnabled ? 'bg-emerald-500' : 'bg-stone-300'
                }`}
                aria-label="Toggle hourly move nudge"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition ${
                    nudgeEnabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            )}
            {nudge.supported !== false && nudge.permission === 'default' && (
              <button
                onClick={enableNotifications}
                className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium shrink-0 transition"
              >
                Enable
              </button>
            )}
          </div>
          {nudge.supported !== false && nudge.permission === 'granted' && nudgeEnabled && (
            <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
              <p className="text-xs text-stone-400">
                {nudge.nextDueAt ? `Next nudge around ${formatClock(nudge.nextDueAt)}` : 'Nudge is warming up…'}
              </p>
              <button
                onClick={testNudge}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Send a test nudge
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Mood sheet ───────────────────────────────────────────────────── */}
      <Sheet open={moodOpen} onOpenChange={setMoodOpen}>
        <SheetContent side="bottom" className="mx-auto w-full max-w-md rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>How am I right now?</SheetTitle>
            <SheetDescription>
              One tap. Add a note if it helps. Nothing is required.
            </SheetDescription>
          </SheetHeader>

          <div className="px-4">
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const selected = moodValue === n
                return (
                  <button
                    key={n}
                    onClick={() => setMoodValue(n)}
                    aria-pressed={selected}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-1 py-3 transition ${
                      selected
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-transparent bg-stone-50 hover:bg-emerald-50/50'
                    }`}
                  >
                    <span
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${
                        selected
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white border border-stone-200 text-stone-500'
                      }`}
                    >
                      {n}
                    </span>
                    <span className="text-[10px] text-stone-400 text-center leading-tight">
                      {MOOD_LABELS[n]}
                    </span>
                  </button>
                )
              })}
            </div>

            <textarea
              className={`${inputCls} mt-4 bg-stone-50/50`}
              placeholder="Optional note — what's underneath the feeling?"
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
              rows={3}
            />
          </div>

          <div className="p-4 flex gap-2">
            <button
              className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
              onClick={() => {
                setMoodValue(null)
                setMoodNote('')
                setMoodOpen(false)
              }}
            >
              Cancel
            </button>
            <button
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition"
              onClick={saveMood}
              disabled={!moodValue || saving}
            >
              Save mood
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Healing check sheet ──────────────────────────────────────────── */}
      <Sheet open={healingOpen} onOpenChange={setHealingOpen}>
        <SheetContent side="bottom" className="mx-auto w-full max-w-md rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Does this move me toward healing?</SheetTitle>
            <SheetDescription>
              The question matters more than the answer. Be honest. Be gentle.
            </SheetDescription>
          </SheetHeader>

          <div className="px-4">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => saveHealing('yes')}
                disabled={saving}
                className="h-16 flex flex-col items-center justify-center gap-1 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white transition"
              >
                <Check className="w-5 h-5" />
                <span className="text-xs font-medium">Yes</span>
              </button>
              <button
                onClick={() => saveHealing('no')}
                disabled={saving}
                className="h-16 flex flex-col items-center justify-center gap-1 rounded-2xl bg-stone-100 hover:bg-stone-200 disabled:opacity-60 text-stone-600 transition"
              >
                <X className="w-5 h-5" />
                <span className="text-xs font-medium">No</span>
              </button>
              <button
                onClick={() => saveHealing('skip')}
                disabled={saving}
                className="h-16 flex flex-col items-center justify-center gap-1 rounded-2xl border border-stone-200 hover:bg-stone-50 disabled:opacity-60 text-stone-500 transition"
              >
                <SkipForward className="w-5 h-5" />
                <span className="text-xs font-medium">Skip</span>
              </button>
            </div>

            <textarea
              className={`${inputCls} mt-4 bg-stone-50/50`}
              placeholder="Optional — what's the thought under the thought?"
              value={healingNote}
              onChange={(e) => setHealingNote(e.target.value)}
              rows={3}
            />
          </div>

          <p className="px-4 pt-3 text-center text-xs text-stone-400">
            There will be days you can&apos;t face this question. Skip is always allowed.
          </p>
        </SheetContent>
      </Sheet>
    </>
  )
}

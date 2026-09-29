'use client'

// Grounding tools — ported from Healing Companion, re-skinned to Tender
// Hours' visual language. Four one-tap tools for hard moments.

import { useEffect, useState } from 'react'
import { ChevronRight, Eye, Snowflake, Wind, Zap } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

// ─── The tool list shown on the Tools tab ───────────────────────────────────

export function GroundingToolList({
  onOpenSenses,
  onOpenBreathing,
  onOpenTipp,
  onOpenColdWater,
}: {
  onOpenSenses: () => void
  onOpenBreathing: () => void
  onOpenTipp: () => void
  onOpenColdWater: () => void
}) {
  const tools = [
    {
      title: '5-4-3-2-1 senses',
      subtitle: 'Step-by-step grounding',
      icon: <Eye className="w-4 h-4" />,
      onClick: onOpenSenses,
    },
    {
      title: 'Box breathing',
      subtitle: '4-4-4-8 · four cycles',
      icon: <Wind className="w-4 h-4" />,
      onClick: onOpenBreathing,
    },
    {
      title: 'TIPP',
      subtitle: 'DBT distress tolerance',
      icon: <Zap className="w-4 h-4" />,
      onClick: onOpenTipp,
    },
    {
      title: 'Cold water cue',
      subtitle: 'Splash or hold ice',
      icon: <Snowflake className="w-4 h-4" />,
      onClick: onOpenColdWater,
    },
  ]

  return (
    <div className="space-y-2">
      {tools.map((t) => (
        <button
          key={t.title}
          onClick={t.onClick}
          className="w-full flex items-center gap-3 rounded-2xl border border-stone-200/60 bg-white p-4 text-left transition hover:bg-emerald-50/50"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            {t.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-800">{t.title}</p>
            <p className="text-xs text-stone-500">{t.subtitle}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-300 shrink-0" />
        </button>
      ))}
    </div>
  )
}

// ─── 5-4-3-2-1 senses flow ──────────────────────────────────────────────────

const SENSES_STEPS = [
  { count: 5, sense: 'see', prompt: 'Name 5 things you can see around you right now.' },
  { count: 4, sense: 'touch', prompt: 'Name 4 things you can feel touching your body.' },
  { count: 3, sense: 'hear', prompt: 'Name 3 sounds you can hear right now.' },
  { count: 2, sense: 'smell', prompt: 'Name 2 things you can smell (or 2 ordinary scents).' },
  { count: 1, sense: 'taste', prompt: 'Name 1 thing you can taste right now.' },
]

export function SensesFlowSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [step, setStep] = useState(0)

  // Start fresh every time the sheet opens.
  useEffect(() => {
    if (open) setStep(0)
  }, [open])

  const isLast = step >= SENSES_STEPS.length - 1
  const current = SENSES_STEPS[step]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto w-full max-w-md rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>5-4-3-2-1 senses</SheetTitle>
          <SheetDescription>
            Step {step + 1} of {SENSES_STEPS.length}. Take your time. No rush.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 flex flex-col items-center gap-4 text-center py-2">
          <div className="w-24 h-24 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <span className="text-4xl font-semibold text-emerald-600">{current.count}</span>
          </div>
          <p className="text-sm font-medium text-stone-700">things you can {current.sense}</p>
          <p className="max-w-xs text-sm text-stone-600">{current.prompt}</p>
          <p className="text-xs text-stone-400">
            Look around. Notice each one. You don&apos;t have to write anything.
          </p>
        </div>

        <div className="p-4 pt-0 flex gap-2">
          {step > 0 && (
            <button
              className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
              onClick={() => setStep(0)}
            >
              Start over
            </button>
          )}
          {isLast ? (
            <button
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
              onClick={() => onOpenChange(false)}
            >
              Done
            </button>
          ) : (
            <button
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
              onClick={() => setStep((s) => s + 1)}
            >
              Next step
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Box breathing (4-4-4-8) ────────────────────────────────────────────────

const BREATHING_PHASES = [
  { name: 'Breathe in', duration: 4 },
  { name: 'Hold', duration: 4 },
  { name: 'Breathe out', duration: 4 },
  { name: 'Hold', duration: 8 },
]
const MAX_CYCLES = 4

export function BoxBreathingSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(BREATHING_PHASES[0].duration)
  const [cycle, setCycle] = useState(0)
  const [running, setRunning] = useState(false)

  // Reset every time the sheet opens.
  useEffect(() => {
    if (open) {
      setPhaseIdx(0)
      setSecondsLeft(BREATHING_PHASES[0].duration)
      setCycle(0)
      setRunning(false)
    }
  }, [open])

  // Tick — only runs when the sheet is open and the timer is active.
  useEffect(() => {
    if (!open || !running) return
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1
        // Phase complete — advance.
        setPhaseIdx((p) => {
          const nextP = (p + 1) % BREATHING_PHASES.length
          if (nextP === 0) setCycle((c) => c + 1)
          setSecondsLeft(BREATHING_PHASES[nextP].duration)
          return nextP
        })
        return s
      })
    }, 1000)
    return () => clearInterval(id)
  }, [open, running])

  // Stop when the four cycles are complete.
  useEffect(() => {
    if (cycle >= MAX_CYCLES) setRunning(false)
  }, [cycle])

  const phase = BREATHING_PHASES[phaseIdx]
  const isDone = cycle >= MAX_CYCLES && !running

  // Ring scale: expanded during "in" and its hold, contracted during "out"
  // and its hold.
  const ringScale = phaseIdx === 0 || phaseIdx === 1 ? 'scale-110' : 'scale-75'

  const startFresh = () => {
    setPhaseIdx(0)
    setSecondsLeft(BREATHING_PHASES[0].duration)
    setCycle(0)
    setRunning(true)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto w-full max-w-md rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Box breathing (4-4-4-8)</SheetTitle>
          <SheetDescription>
            Cycle {Math.min(cycle + (isDone ? 0 : 1), MAX_CYCLES)} of {MAX_CYCLES}. Follow the
            ring. No counting in your head.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 flex flex-col items-center gap-6 py-2">
          <div className="flex h-48 w-48 items-center justify-center">
            <div
              className={`flex h-40 w-40 items-center justify-center rounded-full bg-emerald-100 transition-transform ease-in-out ${ringScale}`}
              style={{ transitionDuration: `${phase.duration * 1000}ms` }}
            >
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-200/70">
                <span className="text-4xl font-light text-emerald-700" aria-live="polite">
                  {secondsLeft}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xl font-medium text-stone-700" aria-live="polite">
            {isDone ? 'Done' : phase.name}
          </p>
          {isDone && (
            <p className="text-sm text-stone-500">Nice. Four cycles complete.</p>
          )}
        </div>

        <div className="p-4 pt-0 flex gap-2">
          <button
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
            onClick={() => onOpenChange(false)}
          >
            Close
          </button>
          {!isDone && (
            <button
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
              onClick={() => setRunning((r) => !r)}
            >
              {running ? 'Pause' : cycle > 0 ? 'Resume' : 'Start'}
            </button>
          )}
          {isDone && (
            <button
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
              onClick={startFresh}
            >
              Do it again
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── TIPP reference card ────────────────────────────────────────────────────

export function TippSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const tips = [
    {
      letter: 'T',
      name: 'Temperature',
      what: 'Cold water on your face, or hold an ice cube.',
      why: 'Activates the dive reflex — slows your heart rate, resets your nervous system.',
    },
    {
      letter: 'I',
      name: 'Intense exercise',
      what: 'A minute or two of effort — jumping jacks, wall push, run in place.',
      why: 'Burns off the adrenaline that comes with high emotion.',
    },
    {
      letter: 'P',
      name: 'Paced breathing',
      what: 'Slow breath in, longer breath out. 4 in, 6-8 out.',
      why: 'Longer exhales switch on the parasympathetic system.',
    },
    {
      letter: 'P',
      name: 'Paired muscle relaxation',
      what: 'Tense each muscle group for 5s, then release. Feet first, up to face.',
      why: 'Tension you didn\u2019t notice releases — body and mind calm together.',
    },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto w-full max-w-md rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>TIPP</SheetTitle>
          <SheetDescription>
            DBT distress-tolerance skill. Use any one when emotion is too high to think. You
            don&apos;t have to do all four.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 flex flex-col gap-2 py-1">
          {tips.map((t) => (
            <div
              key={t.letter + t.name}
              className="flex items-start gap-3 rounded-2xl border border-stone-200/60 bg-white px-4 py-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-white">
                {t.letter}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-800">{t.name}</p>
                <p className="mt-0.5 text-sm text-stone-600">{t.what}</p>
                <p className="mt-1 text-xs text-stone-400">{t.why}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 pt-0 flex gap-2">
          <button
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
            onClick={() => onOpenChange(false)}
          >
            Got it
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Cold water cue ─────────────────────────────────────────────────────────

export function ColdWaterSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [secondsLeft, setSecondsLeft] = useState(60)
  const [running, setRunning] = useState(false)

  // Reset every time the sheet opens.
  useEffect(() => {
    if (open) {
      setSecondsLeft(60)
      setRunning(false)
    }
  }, [open])

  // Tick — only runs when the sheet is open and the timer is active.
  useEffect(() => {
    if (!open || !running) return
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1
        setRunning(false)
        return 0
      })
    }, 1000)
    return () => clearInterval(id)
  }, [open, running])

  const handleStartOrPause = () => {
    if (running) {
      setRunning(false)
    } else {
      setSecondsLeft(60)
      setRunning(true)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto w-full max-w-md rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Cold water cue</SheetTitle>
          <SheetDescription>
            The T in TIPP. The fastest way to reset a high emotion.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 flex flex-col gap-4 py-1">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3">
            <p className="text-sm text-stone-700">
              <span className="font-medium">Go now:</span> Splash cold water on your face, or
              hold an ice cube in your hand for 30 seconds.
            </p>
          </div>

          <div>
            <p className="mb-1 text-xs uppercase tracking-wider text-stone-400">Why it works</p>
            <p className="text-sm text-stone-500">
              Cold activates the mammalian dive reflex. Heart rate drops, blood redirects to
              your brain and core, and the parasympathetic system kicks in. It&apos;s the single
              fastest body-based reset we have. You don&apos;t have to feel like doing it — you
              just have to do it.
            </p>
          </div>

          {/* 60-second cooldown timer */}
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200/60 bg-stone-50 px-4 py-4">
            <p className="text-xs uppercase tracking-wider text-stone-400">
              {running ? 'Cooldown' : '60-second timer'}
            </p>
            <p className="text-4xl font-light text-emerald-600">
              {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
              {String(secondsLeft % 60).padStart(2, '0')}
            </p>
            <button
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition"
              onClick={handleStartOrPause}
            >
              {running ? 'Pause' : secondsLeft === 0 ? 'Restart' : 'Start timer'}
            </button>
          </div>
        </div>

        <div className="p-4 pt-0 flex gap-2">
          <button
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
            onClick={() => onOpenChange(false)}
          >
            Done
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

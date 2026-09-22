'use client'

import { useEffect, useMemo, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useReminders } from '@/hooks/use-reminders'
import { PWAInstallBanner } from '@/components/pwa-install-banner'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Calendar,
  Plus,
  Sparkles,
  ListChecks,
  Timer,
  Activity as ActivityIcon,
  Heart,
  Trash2,
  Pencil,
  Play,
  Square,
  ChevronRight,
  ChevronLeft,
  Smile,
  Frown,
  Meh,
  TrendingUp,
  Bell,
  BellRing,
  Clock,
  X,
  Settings,
  Moon,
  Repeat,
  Download,
} from 'lucide-react'

import {
  Activity,
  ActivityCategory,
  CATEGORIES,
  CATEGORY_LIST,
  HEALING_IMPACT,
  HEALING_IMPACT_LIST,
  STATUS_LABELS,
  REMINDER_PRESETS,
  RECURRENCE_PRESETS,
  WEEKDAY_LABELS,
  RecurrenceRule,
  describeRule,
  decodeRule,
  todayISODate,
  nowISO,
  isoFromLocal,
  timeHHMMFromISO,
  formatTime,
  formatDuration,
  minutesBetween,
  formatPrettyDate,
  shortDate,
  addDays,
  relativeDayLabel,
} from '@/lib/healing'

// ─── Tab type ────────────────────────────────────────────────────────────────
type Tab = 'now' | 'today' | 'week' | 'insights'

// ─── Main page ───────────────────────────────────────────────────────────────
function getInitialTab(): Tab {
  if (typeof window === 'undefined') return 'now'
  const params = new URLSearchParams(window.location.search)
  const t = params.get('tab')
  if (t === 'now' || t === 'today' || t === 'week' || t === 'insights') return t
  return 'now'
}

export default function Home() {
  const [tab, setTab] = useState<Tab>(getInitialTab)
  const today = todayISODate()
  const reminders = useReminders()

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50/40 via-stone-50 to-stone-50 dark:from-emerald-950/40 dark:via-stone-950 dark:to-stone-950 text-stone-800 dark:text-stone-100">
      <Header reminders={reminders} onOpenSettings={() => setTab('now')} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 pb-24">
        <PWAInstallBanner />
        <TabBar tab={tab} setTab={setTab} />
        <div className="mt-6">
          {tab === 'now' && <NowView reminders={reminders} />}
          {tab === 'today' && <DayView date={today} />}
          {tab === 'week' && <WeekView />}
          {tab === 'insights' && <InsightsView />}
        </div>
      </main>
      <Footer />
      {reminders.eodOpen && (
        <EndOfDayReflectionModal
          date={today}
          onClose={reminders.closeEodModal}
        />
      )}
    </div>
  )
}

// ─── Header ──────────────────────────────────────────────────────────────────
function Header({
  reminders,
  onOpenSettings,
}: {
  reminders: ReturnType<typeof useReminders>
  onOpenSettings: () => void
}) {
  const today = new Date()
  const dateStr = today.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  return (
    <header className="w-full bg-gradient-to-r from-emerald-100/60 via-teal-50 to-stone-50 dark:from-emerald-900/40 dark:via-teal-950 dark:to-stone-950 border-b border-emerald-100 dark:border-emerald-900/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
          <Heart className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-800 dark:text-stone-100">
            Tender Hours
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">{dateStr} · a gentle schedule for healing</p>
        </div>
        <ReminderBell reminders={reminders} onOpenSettings={onOpenSettings} />
        <ThemeToggle />
      </div>
    </header>
  )
}

function ReminderBell({
  reminders,
  onOpenSettings,
}: {
  reminders: ReturnType<typeof useReminders>
  onOpenSettings: () => void
}) {
  const [open, setOpen] = useState(false)
  const count = reminders.pending.length
  const needsPermission =
    reminders.permission !== 'granted' && reminders.permission !== 'unsupported'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-10 h-10 rounded-xl bg-white border border-stone-200 shadow-sm flex items-center justify-center hover:bg-stone-50 transition"
        aria-label="Reminders"
      >
        {count > 0 || needsPermission ? (
          <BellRing className="w-5 h-5 text-emerald-600" />
        ) : (
          <Bell className="w-5 h-5 text-stone-500" />
        )}
        {(count > 0 || needsPermission) && (
          <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {count + (needsPermission ? 1 : 0)}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-stone-200 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-semibold text-stone-800 text-sm">Reminders</h3>
              <button
                onClick={() => {
                  setOpen(false)
                  onOpenSettings()
                }}
                className="text-stone-400 hover:text-stone-600"
                aria-label="Reminder settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {needsPermission && (
                <div className="p-4 border-b border-stone-100 bg-amber-50">
                  <p className="text-sm text-stone-700">
                    {reminders.permission === 'unsupported'
                      ? 'Browser notifications aren’t supported here, but in-app reminders will still appear in this panel.'
                      : 'Turn on browser notifications to be nudged even when this tab is in the background.'}
                  </p>
                  {reminders.permission !== 'unsupported' && (
                    <button
                      onClick={() => reminders.requestPermission()}
                      className="mt-3 w-full px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium"
                    >
                      Enable notifications
                    </button>
                  )}
                </div>
              )}

              {reminders.pending.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="text-3xl">🌿</div>
                  <p className="text-sm text-stone-500 mt-2">
                    No reminders waiting. You're all caught up.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {reminders.pending.map((p) => (
                    <PendingReminderRow
                      key={p.id}
                      reminder={p}
                      onSnooze={(m) => reminders.snooze(p.id, m)}
                      onDismiss={() => reminders.dismiss(p.id)}
                    />
                  ))}
                </ul>
              )}
              {reminders.pending.length > 1 && (
                <div className="p-2 border-t border-stone-100">
                  <button
                    onClick={reminders.dismissAll}
                    className="w-full text-xs text-stone-500 hover:text-stone-700 py-1"
                  >
                    Dismiss all
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function PendingReminderRow({
  reminder,
  onSnooze,
  onDismiss,
}: {
  reminder: ReturnType<typeof useReminders>['pending'][number]
  onSnooze: (m: number) => void
  onDismiss: () => void
}) {
  const a = reminder.activity
  const cat = CATEGORIES[a.category as ActivityCategory] ?? CATEGORIES.other
  return (
    <li className="p-3">
      <div className="flex items-start gap-2">
        <div className={`w-2 h-2 mt-1.5 rounded-full ${cat.dot} shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-stone-800 truncate">{a.title}</p>
          <p className="text-xs text-stone-500 mt-0.5">
            {formatTime(a.startTime)} · {cat.emoji} {cat.label}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-stone-300 hover:text-stone-500 shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-1 mt-2">
        <button
          onClick={() => onSnooze(5)}
          className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"
        >
          Snooze 5m
        </button>
        <button
          onClick={() => onSnooze(15)}
          className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"
        >
          Snooze 15m
        </button>
        <button
          onClick={() => onSnooze(60)}
          className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"
        >
          1 hour
        </button>
      </div>
    </li>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-stone-200/60 dark:border-stone-800/60 bg-white/50 dark:bg-stone-950/50 backdrop-blur-sm py-4">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center text-xs text-stone-400 dark:text-stone-500">
        Tender Hours · one moment at a time
      </div>
    </footer>
  )
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────
function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'now', label: 'Now', icon: <Timer className="w-4 h-4" /> },
    { id: 'today', label: 'Today', icon: <ListChecks className="w-4 h-4" /> },
    { id: 'week', label: 'Schedule', icon: <Calendar className="w-4 h-4" /> },
    { id: 'insights', label: 'Insights', icon: <Sparkles className="w-4 h-4" /> },
  ]
  return (
    <nav className="flex gap-1 p-1 bg-white/70 dark:bg-stone-900/70 rounded-2xl border border-stone-200/60 dark:border-stone-800/60 backdrop-blur-sm shadow-sm overflow-x-auto">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => setTab(it.id)}
          className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
            tab === it.id
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          {it.icon}
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  )
}

// ─── Hooks / API helpers ─────────────────────────────────────────────────────
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json() as Promise<T>
}

// ─── Now view: live activity tracking ────────────────────────────────────────
function NowView({ reminders }: { reminders: ReturnType<typeof useReminders> }) {
  const { toast } = useToast()
  const today = todayISODate()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [clock, setClock] = useState(Date.now())

  // Poll every 10s for active state updates + re-render the live timer
  useEffect(() => {
    let stop = false
    async function load() {
      setLoading(true)
      try {
        const data = await api<{ activities: Activity[] }>(
          `/api/activities?date=${today}&status=active`
        )
        if (!stop) setActivities(data.activities)
      } catch (e) {
        console.error(e)
      } finally {
        if (!stop) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 15000)
    return () => {
      stop = true
      clearInterval(interval)
    }
  }, [today])

  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const active = activities[0] ?? null

  async function startActivity(input: {
    title: string
    category: ActivityCategory
    notes?: string
    moodBefore?: number
  }) {
    const startTime = nowISO()
    await api<{ activity: Activity }>('/api/activities', {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        notes: input.notes ?? null,
        category: input.category,
        date: today,
        startTime,
        endTime: null,
        status: 'active',
        moodBefore: input.moodBefore ?? null,
      }),
    })
    toast({ title: 'Started tracking', description: input.title })
    // Reload
    const data = await api<{ activities: Activity[] }>(
      `/api/activities?date=${today}&status=active`
    )
    setActivities(data.activities)
  }

  async function endActivity(reflection: {
    healingImpact: 'helped' | 'neutral' | 'hinder' | 'unsure'
    healingNote?: string
    moodAfter?: number
  }) {
    if (!active) return
    const endTime = nowISO()
    const durationMin = minutesBetween(active.startTime, endTime)
    await api<{ activity: Activity }>(`/api/activities/${active.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'completed',
        endTime,
        durationMin,
        healingImpact: reflection.healingImpact,
        healingNote: reflection.healingNote ?? null,
        moodAfter: reflection.moodAfter ?? null,
      }),
    })
    toast({
      title: 'Reflection saved',
      description: `${formatDuration(durationMin)} logged · ${reflection.healingImpact}`,
    })
    setActivities([])
  }

  async function discardActivity() {
    if (!active) return
    await api(`/api/activities/${active.id}`, { method: 'DELETE' })
    toast({ title: 'Activity discarded' })
    setActivities([])
  }

  return (
    <div className="space-y-6">
      <ActiveActivityCard
        active={active}
        clock={clock}
        onEnd={endActivity}
        onDiscard={discardActivity}
      />
      {!active && <StartActivityCard onStart={  startActivity} />}
      {active && (
        <p className="text-center text-xs text-stone-400">
          You're tracking an activity right now. End it to save a reflection, or discard it
          if it wasn't what you meant to log.
        </p>
      )}
      <QuickLogCard
        onSaved={() => {
          toast({ title: 'Quick log saved', description: 'Logged with the time you set' })
        }}
      />
      <ReminderSettingsCard reminders={reminders} />
    </div>
  )
}

// ─── Reminder settings card (permission + daily check-in) ─────────────────────
function ReminderSettingsCard({ reminders }: { reminders: ReturnType<typeof useReminders> }) {
  const [showInstallHelp, setShowInstallHelp] = useState(false)
  return (
    <div className="rounded-3xl bg-white border border-stone-200/60 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
          <Bell className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-800">Reminders</h2>
          <p className="text-xs text-stone-500">
            Gentle nudges before each scheduled activity, plus an optional daily check-in.
          </p>
        </div>
      </div>

      {/* Permission row */}
      <div className="flex items-center justify-between gap-3 py-3 border-t border-stone-100">
        <div>
          <p className="text-sm font-medium text-stone-700">Browser notifications</p>
          <p className="text-xs text-stone-500 mt-0.5">
            {reminders.permission === 'granted'
              ? 'On — you’ll be nudged even if this tab is in the background.'
              : reminders.permission === 'denied'
              ? 'Blocked in your browser. Use the in-app reminders panel instead.'
              : reminders.permission === 'unsupported'
              ? 'Not supported in this browser. In-app reminders will still work.'
              : 'Allow notifications to get nudged before each activity.'}
          </p>
        </div>
        {reminders.permission !== 'granted' && reminders.permission !== 'unsupported' && (
          <button
            onClick={() => reminders.requestPermission()}
            disabled={reminders.permission === 'denied'}
            className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium shrink-0"
          >
            {reminders.permission === 'denied' ? 'Blocked' : 'Enable'}
          </button>
        )}
        {reminders.permission === 'granted' && (
          <span className="text-xs text-emerald-600 font-medium shrink-0">✓ On</span>
        )}
      </div>

      {/* Daily check-in row */}
      <div className="flex items-center justify-between gap-3 py-3 border-t border-stone-100">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-700">Daily check-in reminder</p>
          <p className="text-xs text-stone-500 mt-0.5">
            A gentle nudge to start your day mindfully.
          </p>
        </div>
        <button
          onClick={() => reminders.setDailyCheckIn({ enabled: !reminders.daily.enabled })}
          className={`relative w-11 h-6 rounded-full transition shrink-0 ${
            reminders.daily.enabled ? 'bg-emerald-500' : 'bg-stone-300'
          }`}
          aria-label="Toggle daily check-in"
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition ${
              reminders.daily.enabled ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>
      {reminders.daily.enabled && (
        <div className="flex items-center gap-2 py-3 border-t border-stone-100">
          <Clock className="w-4 h-4 text-stone-400" />
          <span className="text-sm text-stone-600">Remind me at</span>
          <input
            type="time"
            value={reminders.daily.time}
            onChange={(e) => reminders.setDailyCheckIn({ time: e.target.value })}
            className="rounded-lg border border-stone-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
      )}

      {/* End-of-day reflection row */}
      <div className="flex items-center justify-between gap-3 py-3 border-t border-stone-100">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-700 flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5 text-indigo-500" />
            End-of-day reflection
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            A gentle prompt to look back at your day and what moved you toward healing.
          </p>
        </div>
        <button
          onClick={() => reminders.setEndOfDay({ enabled: !reminders.eod.enabled })}
          className={`relative w-11 h-6 rounded-full transition shrink-0 ${
            reminders.eod.enabled ? 'bg-indigo-500' : 'bg-stone-300'
          }`}
          aria-label="Toggle end-of-day reflection"
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition ${
              reminders.eod.enabled ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>
      {reminders.eod.enabled && (
        <>
          <div className="flex items-center gap-2 py-3 border-t border-stone-100">
            <Clock className="w-4 h-4 text-stone-400" />
            <span className="text-sm text-stone-600">Reflect at</span>
            <input
              type="time"
              value={reminders.eod.time}
              onChange={(e) => reminders.setEndOfDay({ time: e.target.value })}
              className="rounded-lg border border-stone-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
            <button
              onClick={reminders.openEodModal}
              className="ml-auto text-xs text-stone-500 hover:text-stone-700 underline"
            >
              Open now
            </button>
          </div>
        </>
      )}

      <p className="text-xs text-stone-400 mt-3 leading-relaxed">
        Per-activity reminders are set when you create or edit a planned activity —
        look for the “Reminder” chips. Your browser needs to be open (even in the
        background) for notifications to fire.
      </p>

      {/* How to install — make reminders work even when the browser is closed */}
      <div className="mt-3 border-t border-stone-100 pt-3">
        <button
          onClick={() => setShowInstallHelp((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          <Download className="w-4 h-4" />
          How to install Tender Hours
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showInstallHelp ? 'rotate-90' : ''}`} />
        </button>
        {showInstallHelp && <InstallHelpContent />}
      </div>
    </div>
  )
}

// ─── Install help content (per-platform instructions) ────────────────────────
function InstallHelpContent() {
  return (
    <div className="mt-3 space-y-3 text-sm text-stone-600">
      <p>
        Installing Tender Hours as an app means reminders will fire even when
        your browser is closed (on Android and modern iPhone). It also opens
        full-screen with its own icon, like a native app.
      </p>

      {/* Brave / Chrome / Edge — desktop */}
      <InstallStep
        n={1}
        title="On Brave, Chrome, or Edge (desktop)"
        steps={[
          <>Click the <strong>install icon</strong> in the address bar (looks like a monitor with a down arrow), or open the browser menu and choose <strong>Install Tender Hours…</strong></>,
          <>Confirm the install prompt. Tender Hours opens in its own window and adds an icon to your dock / taskbar.</>,
          <>On Brave: if you don't see the prompt, make sure <strong>Settings → Privacy and security → “Use Google services to push messages”</strong> is enabled.</>,
        ]}
      />

      {/* Android */}
      <InstallStep
        n={2}
        title="On Android (Brave, Chrome)"
        steps={[
          <>Open Tender Hours in your browser. You should see an <strong>Install</strong> button at the top of the page — tap it.</>,
          <>Or open the browser menu (⋮) and tap <strong>Install app</strong> / <strong>Add to Home screen</strong>.</>,
          <>Confirm. The icon appears in your app drawer and on your home screen. Notifications fire even when the browser is closed.</>,
        ]}
      />

      {/* iOS */}
      <InstallStep
        n={3}
        title="On iPhone or iPad (iOS 16.4+)"
        steps={[
          <>Open Tender Hours in <strong>Safari</strong> (not Chrome or Brave — iOS only allows web push from Safari-installed PWAs).</>,
          <>Tap the <strong>Share</strong> button at the bottom of Safari (square with an up arrow).</>,
          <>Scroll down and tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</>,
          <>The Tender Hours icon appears on your home screen. Open it from there to enable notifications.</>,
        ]}
      />

      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
        <p className="text-xs text-emerald-800">
          <strong>Need to enable notifications after installing?</strong> Tap
          the bell icon in the top-right of Tender Hours, then click
          <strong>Enable notifications</strong>. If you accidentally blocked
          them, click the 🔒 icon in your browser's address bar, find
          <strong>Notifications</strong>, and set it to <strong>Allow</strong>.
        </p>
      </div>
    </div>
  )
}

function InstallStep({
  n,
  title,
  steps,
}: {
  n: number
  title: string
  steps: React.ReactNode[]
}) {
  return (
    <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
      <p className="font-medium text-stone-800 flex items-center gap-2 mb-2">
        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">
          {n}
        </span>
        {title}
      </p>
      <ol className="space-y-1.5 text-xs text-stone-600 pl-7 list-decimal">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  )
}

// Card showing the live, currently-running activity with a ticking timer.
function ActiveActivityCard({
  active,
  clock,
  onEnd,
  onDiscard,
}: {
  active: Activity | null
  clock: number
  onEnd: (r: {
    healingImpact: 'helped' | 'neutral' | 'hinder' | 'unsure'
    healingNote?: string
    moodAfter?: number
  }) => void
  onDiscard: () => void
}) {
  const [showReflection, setShowReflection] = useState(false)
  const [healingImpact, setHealingImpact] = useState<
    'helped' | 'neutral' | 'hinder' | 'unsure'
  >('helped')
  const [healingNote, setHealingNote] = useState('')
  const [moodAfter, setMoodAfter] = useState(3)

  if (!active) return null

  const elapsedMin = Math.max(
    0,
    Math.floor((clock - new Date(active.startTime).getTime()) / 60000)
  )
  const h = Math.floor(elapsedMin / 60)
  const m = elapsedMin % 60
  const s = Math.floor((clock - new Date(active.startTime).getTime()) / 1000) % 60
  const cat = CATEGORIES[active.category as ActivityCategory] ?? CATEGORIES.other

  return (
    <div className="rounded-3xl bg-white border border-emerald-200/60 shadow-sm overflow-hidden">
      <div className={`h-2 ${cat.dot}`} />
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">
              In progress · started {formatTime(active.startTime)}
            </p>
            <h2 className="text-2xl font-semibold text-stone-800 mt-1">{active.title}</h2>
            {active.notes && <p className="text-stone-500 mt-1 text-sm">{active.notes}</p>}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${cat.chip}`}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </span>
              {active.moodBefore && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                  Mood before: {active.moodBefore}/5
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-mono tabular-nums text-stone-800">
              {h > 0 ? `${h}:` : ''}
              {String(m).padStart(2, '0')}:
              {String(s).padStart(2, '0')}
            </div>
            <p className="text-xs text-stone-400 mt-1">{formatDuration(elapsedMin)}</p>
          </div>
        </div>

        {!showReflection ? (
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setShowReflection(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
            >
              <Square className="w-4 h-4" />
              End &amp; Reflect
            </button>
            <button
              onClick={onDiscard}
              className="px-4 py-3 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
              aria-label="Discard activity"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <ReflectionForm
            healingImpact={healingImpact}
            setHealingImpact={setHealingImpact}
            healingNote={healingNote}
            setHealingNote={setHealingNote}
            moodAfter={moodAfter}
            setMoodAfter={setMoodAfter}
            onCancel={() => setShowReflection(false)}
            onSave={() =>
              onEnd({ healingImpact, healingNote: healingNote || undefined, moodAfter })
            }
          />
        )}
      </div>
    </div>
  )
}

function ReflectionForm({
  healingImpact,
  setHealingImpact,
  healingNote,
  setHealingNote,
  moodAfter,
  setMoodAfter,
  onCancel,
  onSave,
}: {
  healingImpact: 'helped' | 'neutral' | 'hinder' | 'unsure'
  setHealingImpact: (v: 'helped' | 'neutral' | 'hinder' | 'unsure') => void
  healingNote: string
  setHealingNote: (v: string) => void
  moodAfter: number
  setMoodAfter: (v: number) => void
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <div className="mt-6 border-t border-stone-200 pt-5 space-y-4">
      <div>
        <label className="text-sm font-medium text-stone-700">
          Did this move you toward healing?
        </label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {HEALING_IMPACT_LIST.map((key) => {
            const h = HEALING_IMPACT[key]
            const selected = healingImpact === key
            return (
              <button
                key={key}
                onClick={() => setHealingImpact(key)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition ${
                  selected
                    ? `${h.chip} ring-2 ring-offset-1 ring-stone-300`
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <span className="text-lg">{h.emoji}</span>
                {h.label}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-stone-700">Mood after (1-5)</label>
        <div className="flex items-center gap-2 mt-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setMoodAfter(n)}
              className={`w-10 h-10 rounded-full border flex items-center justify-center text-sm font-semibold transition ${
                moodAfter === n
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'border-stone-200 text-stone-500 hover:bg-stone-50'
              }`}
            >
              {n}
            </button>
          ))}
          <div className="ml-2 text-stone-400">
            {moodAfter <= 2 ? <Frown className="w-5 h-5" /> : moodAfter === 3 ? <Meh className="w-5 h-5" /> : <Smile className="w-5 h-5" />}
          </div>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-stone-700">A short note (optional)</label>
        <textarea
          value={healingNote}
          onChange={(e) => setHealingNote(e.target.value)}
          rows={3}
          placeholder="How did this feel? What did you notice?"
          className="mt-2 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50"
        >
          Back
        </button>
        <button
          onClick={onSave}
          className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
        >
          Save reflection
        </button>
      </div>
    </div>
  )
}

// Card to start a fresh live activity with title + category + mood.
function StartActivityCard({
  onStart,
}: {
  onStart: (input: {
    title: string
    category: ActivityCategory
    notes?: string
    moodBefore?: number
  }) => void
}) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ActivityCategory>('mindfulness')
  const [notes, setNotes] = useState('')
  const [moodBefore, setMoodBefore] = useState(3)

  return (
    <div className="rounded-3xl bg-white border border-stone-200/60 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <Play className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-800">What are you doing right now?</h2>
          <p className="text-xs text-stone-500">Start a live timer and reflect on it when you finish.</p>
        </div>
      </div>
      <div className="space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Walking in the park, journaling, calling a friend…"
          className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
        <div>
          <label className="text-xs uppercase tracking-wide text-stone-500 font-semibold">
            Category
          </label>
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {CATEGORY_LIST.map((c) => {
              const meta = CATEGORIES[c]
              const selected = category === c
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition ${
                    selected ? `${meta.chip} ring-2 ring-offset-1 ring-stone-300` : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  <span>{meta.emoji}</span>
                  {meta.short}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-stone-500 font-semibold">
            Mood before (1-5)
          </label>
          <div className="flex items-center gap-2 mt-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setMoodBefore(n)}
                className={`w-9 h-9 rounded-full border flex items-center justify-center text-sm font-semibold transition ${
                  moodBefore === n
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
        <button
          onClick={() => {
            if (!title.trim()) return
            onStart({
              title: title.trim(),
              category,
              notes: notes.trim() || undefined,
              moodBefore,
            })
            setTitle('')
            setNotes('')
          }}
          disabled={!title.trim()}
          className="w-full px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition"
        >
          Start tracking
        </button>
      </div>
    </div>
  )
}

// Quick log: log a completed activity after the fact, with start time + duration.
function QuickLogCard({ onSaved }: { onSaved: () => void }) {
  const today = todayISODate()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ActivityCategory>('movement')
  const [startTime, setStartTime] = useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - 30)
    return timeHHMMFromISO(d.toISOString())
  })
  const [durationMin, setDurationMin] = useState(30)
  const [healingImpact, setHealingImpact] = useState<
    'helped' | 'neutral' | 'hinder' | 'unsure'
  >('helped')
  const [healingNote, setHealingNote] = useState('')

  async function save() {
    if (!title.trim()) return
    const startISO = isoFromLocal(today, startTime)
    const endISO = new Date(new Date(startISO).getTime() + durationMin * 60000).toISOString()
    await api('/api/activities', {
      method: 'POST',
      body: JSON.stringify({
        title: title.trim(),
        category,
        date: today,
        startTime: startISO,
        endTime: endISO,
        durationMin,
        status: 'completed',
        healingImpact,
        healingNote: healingNote.trim() || null,
      }),
    })
    setTitle('')
    setHealingNote('')
    onSaved()
  }

  return (
    <div className="rounded-3xl bg-white border border-stone-200/60 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
          <ActivityIcon className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-800">Quick log a past activity</h2>
          <p className="text-xs text-stone-500">Already finished something? Log it with a start time and duration.</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What did you do?"
          className="rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 sm:col-span-2"
        />
        <div>
          <label className="text-xs uppercase tracking-wide text-stone-500 font-semibold">
            Start time
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-stone-500 font-semibold">
            Duration (minutes)
          </label>
          <input
            type="number"
            min={1}
            value={durationMin}
            onChange={(e) => setDurationMin(Math.max(1, Number(e.target.value)))}
            className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs uppercase tracking-wide text-stone-500 font-semibold">
            Category
          </label>
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {CATEGORY_LIST.map((c) => {
              const meta = CATEGORIES[c]
              const selected = category === c
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition ${
                    selected ? `${meta.chip} ring-2 ring-offset-1 ring-stone-300` : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  <span>{meta.emoji}</span>
                  {meta.short}
                </button>
              )
            })}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs uppercase tracking-wide text-stone-500 font-semibold">
            Did it move you toward healing?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            {HEALING_IMPACT_LIST.map((key) => {
              const h = HEALING_IMPACT[key]
              const selected = healingImpact === key
              return (
                <button
                  key={key}
                  onClick={() => setHealingImpact(key)}
                  className={`flex items-center gap-2 px-2 py-2 rounded-xl border text-xs font-medium transition ${
                    selected ? `${h.chip} ring-2 ring-offset-1 ring-stone-300` : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <span className="text-base">{h.emoji}</span>
                  {h.label}
                </button>
              )
            })}
          </div>
        </div>
        <textarea
          value={healingNote}
          onChange={(e) => setHealingNote(e.target.value)}
          rows={2}
          placeholder="A short reflection (optional)"
          className="rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 sm:col-span-2 resize-none"
        />
      </div>
      <button
        onClick={save}
        disabled={!title.trim()}
        className="mt-4 w-full px-4 py-3 rounded-xl bg-stone-800 hover:bg-stone-900 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition"
      >
        Save to today
      </button>
    </div>
  )
}

// ─── Day view: full log for one day, with edit / delete / start planned ──────
function DayView({ date }: { date: string }) {
  const { toast } = useToast()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [addingPlanned, setAddingPlanned] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await api<{ activities: Activity[] }>(`/api/activities?date=${date}`)
      setActivities(data.activities)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [date])

  async function startPlanned(a: Activity) {
    const startTime = nowISO()
    await api(`/api/activities/${a.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active', startTime, date: todayISODate() }),
    })
    toast({ title: 'Started', description: a.title })
    load()
  }

  async function completeNow(a: Activity) {
    const endTime = nowISO()
    const durationMin = minutesBetween(a.startTime, endTime)
    await api(`/api/activities/${a.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'completed',
        endTime,
        durationMin,
        healingImpact: a.healingImpact ?? 'helped',
      }),
    })
    toast({ title: 'Marked complete', description: `${formatDuration(durationMin)}` })
    load()
  }

  async function skip(a: Activity) {
    await api(`/api/activities/${a.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'skipped' }),
    })
    load()
  }

  async function remove(id: string) {
    await api(`/api/activities/${id}`, { method: 'DELETE' })
    load()
  }

  const grouped = useMemo(() => {
    const planned = activities.filter((a) => a.status === 'planned')
    const active = activities.filter((a) => a.status === 'active')
    const done = activities
      .filter((a) => a.status === 'completed' || a.status === 'skipped')
      .sort((a, b) => (a.startTime < b.startTime ? -1 : 1))
    return { planned, active, done }
  }, [activities])

  const healingMin = activities
    .filter((a) => a.healingImpact === 'helped')
    .reduce((sum, a) => sum + (a.durationMin ?? 0), 0)

  return (
    <div className="space-y-6">
      <DayHeader date={date} healingMin={healingMin} total={activities.length} />

      <div className="flex justify-end">
        <button
          onClick={() => setAddingPlanned(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add planned activity
        </button>
      </div>

      {addingPlanned && (
        <PlannedActivityForm
          date={date}
          onCancel={() => setAddingPlanned(false)}
          onSaved={() => {
            setAddingPlanned(false)
            load()
            toast({ title: 'Activity scheduled' })
          }}
        />
      )}

      {loading ? (
        <div className="text-center text-stone-400 py-12 text-sm">Loading…</div>
      ) : activities.length === 0 ? (
        <EmptyDay date={date} />
      ) : (
        <>
          {grouped.active.length > 0 && (
            <Section title="In progress" icon={<Timer className="w-4 h-4" />}>
              {grouped.active.map((a) => (
                <ActivityRow
                  key={a.id}
                  a={a}
                  onStartPlanned={() => startPlanned(a)}
                  onCompleteActive={() => completeNow(a)}
                  onSkip={() => skip(a)}
                  onEdit={() => setEditing(a)}
                  onDelete={() => remove(a.id)}
                />
              ))}
            </Section>
          )}
          {grouped.planned.length > 0 && (
            <Section title="Planned" icon={<Calendar className="w-4 h-4" />}>
              {grouped.planned.map((a) => (
                <ActivityRow
                  key={a.id}
                  a={a}
                  onStartPlanned={() => startPlanned(a)}
                  onCompleteActive={() => completeNow(a)}
                  onSkip={() => skip(a)}
                  onEdit={() => setEditing(a)}
                  onDelete={() => remove(a.id)}
                />
              ))}
            </Section>
          )}
          {grouped.done.length > 0 && (
            <Section title="Logged" icon={<ListChecks className="w-4 h-4" />}>
              {grouped.done.map((a) => (
                <ActivityRow
                  key={a.id}
                  a={a}
                  onStartPlanned={() => startPlanned(a)}
                  onCompleteActive={() => completeNow(a)}
                  onSkip={() => skip(a)}
                  onEdit={() => setEditing(a)}
                  onDelete={() => remove(a.id)}
                />
              ))}
            </Section>
          )}
        </>
      )}

      {editing && (
        <EditDialog
          a={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
            toast({ title: 'Activity updated' })
          }}
        />
      )}
    </div>
  )
}

function DayHeader({ date, healingMin, total }: { date: string; healingMin: number; total: number }) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white p-6 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-emerald-100 font-semibold">
        {relativeDayLabel(date)}
      </p>
      <h2 className="text-2xl font-semibold mt-1">{formatPrettyDate(date)}</h2>
      <div className="flex gap-6 mt-3">
        <div>
          <div className="text-2xl font-semibold">{healingMin} min</div>
          <div className="text-xs text-emerald-100">moved toward healing</div>
        </div>
        <div>
          <div className="text-2xl font-semibold">{total}</div>
          <div className="text-xs text-emerald-100">activities</div>
        </div>
      </div>
    </div>
  )
}

function EmptyDay({ date }: { date: string }) {
  return (
    <div className="rounded-3xl bg-white border border-dashed border-stone-200 p-12 text-center">
      <div className="text-4xl">🌱</div>
      <h3 className="text-lg font-semibold text-stone-700 mt-2">A fresh day</h3>
      <p className="text-sm text-stone-500 mt-1">
        Nothing logged for {relativeDayLabel(date)} yet. Add a planned activity or start
        tracking something right now.
      </p>
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
        {icon}
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function ActivityRow({
  a,
  onStartPlanned,
  onCompleteActive,
  onSkip,
  onEdit,
  onDelete,
}: {
  a: Activity
  onStartPlanned: () => void
  onCompleteActive: () => void
  onSkip: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const cat = CATEGORIES[a.category as ActivityCategory] ?? CATEGORIES.other
  const status = STATUS_LABELS[a.status as keyof typeof STATUS_LABELS] ?? STATUS_LABELS.planned
  const healing = a.healingImpact
    ? HEALING_IMPACT[a.healingImpact as keyof typeof HEALING_IMPACT]
    : null

  return (
    <div className="rounded-2xl bg-white border border-stone-200/60 p-4 hover:border-stone-300 transition">
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 mt-1.5 rounded-full ${cat.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-stone-800 truncate">{a.title}</p>
              <p className="text-xs text-stone-500 mt-0.5">
                {formatTime(a.startTime)}
                {a.endTime ? ` – ${formatTime(a.endTime)}` : ''}
                {a.durationMin ? ` · ${formatDuration(a.durationMin)}` : ''}
              </p>
            </div>
            <span
              className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${status.chip}`}
            >
              {status.label}
            </span>
          </div>
          {a.notes && <p className="text-sm text-stone-500 mt-2">{a.notes}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cat.chip}`}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </span>
            {healing && (
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${healing.chip}`}>
                <span>{healing.emoji}</span>
                {healing.label}
              </span>
            )}
            {a.moodBefore != null && a.moodAfter != null && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                Mood {a.moodBefore} → {a.moodAfter}
              </span>
            )}
            {a.status === 'planned' && a.reminderMin != null && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                <Bell className="w-3 h-3" />
                {a.reminderMin === 0
                  ? 'Reminder at start'
                  : `${a.reminderMin} min before`}
              </span>
            )}
            {a.isRecurrenceTemplate && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                <Repeat className="w-3 h-3" />
                {describeRule(decodeRule(a.recurrenceRule))}
              </span>
            )}
            {!a.isRecurrenceTemplate && a.recurrenceTemplateId && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-sky-50/50 text-sky-600 border border-sky-200">
                <Repeat className="w-3 h-3" />
                Recurring
              </span>
            )}
          </div>
          {a.healingNote && (
            <p className="text-sm text-stone-600 mt-2 italic border-l-2 border-emerald-300 pl-3">
              {a.healingNote}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 justify-end">
        {a.status === 'planned' && (
          <>
            <ActionButton onClick={onStartPlanned} tone="primary">
              <Play className="w-3.5 h-3.5" /> Start now
            </ActionButton>
            <ActionButton onClick={onSkip}>Skip</ActionButton>
          </>
        )}
        {a.status === 'active' && (
          <ActionButton onClick={onCompleteActive} tone="primary">
            <Square className="w-3.5 h-3.5" /> Mark done
          </ActionButton>
        )}
        <ActionButton onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" /> Edit
        </ActionButton>
        <ActionButton onClick={onDelete} tone="danger">
          <Trash2 className="w-3.5 h-3.5" />
        </ActionButton>
      </div>
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  tone = 'default',
}: {
  children: React.ReactNode
  onClick: () => void
  tone?: 'default' | 'primary' | 'danger'
}) {
  const cls =
    tone === 'primary'
      ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500'
      : tone === 'danger'
      ? 'border-stone-200 text-stone-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${cls}`}
    >
      {children}
    </button>
  )
}

// ─── Planned activity form (used in DayView) ────────────────────────────────
function PlannedActivityForm({
  date,
  onCancel,
  onSaved,
}: {
  date: string
  onCancel: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ActivityCategory>('mindfulness')
  const [time, setTime] = useState('09:00')
  const [durationMin, setDurationMin] = useState(30)
  const [notes, setNotes] = useState('')
  const [reminderMin, setReminderMin] = useState<number | null>(5)
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null)

  async function save() {
    if (!title.trim()) return
    const startTime = isoFromLocal(date, time)
    await api('/api/activities', {
      method: 'POST',
      body: JSON.stringify({
        title: title.trim(),
        category,
        date,
        startTime,
        durationMin,
        notes: notes.trim() || null,
        status: 'planned',
        reminderMin,
        recurrenceRule,
      }),
    })
    onSaved()
  }

  return (
    <div className="rounded-2xl bg-white border border-emerald-200/60 p-4 space-y-3">
      <h4 className="font-semibold text-stone-700">Add a planned activity</h4>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What will you do?"
        className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wide text-stone-500 font-semibold">
            When
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-stone-500 font-semibold">
            Duration (min)
          </label>
          <input
            type="number"
            min={1}
            value={durationMin}
            onChange={(e) => setDurationMin(Math.max(1, Number(e.target.value)))}
            className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-stone-500 font-semibold">
          Category
        </label>
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {CATEGORY_LIST.map((c) => {
            const meta = CATEGORIES[c]
            const selected = category === c
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition ${
                  selected ? `${meta.chip} ring-2 ring-offset-1 ring-stone-300` : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                }`}
              >
                <span>{meta.emoji}</span>
                {meta.short}
              </button>
            )
          })}
        </div>
      </div>
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
      />
      <div>
        <label className="text-xs uppercase tracking-wide text-stone-500 font-semibold">
          Repeat
        </label>
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {RECURRENCE_PRESETS.map((r, i) => {
            const selected =
              recurrenceRule === null
                ? r.rule === null
                : r.rule !== null &&
                  JSON.stringify(r.rule) === JSON.stringify(recurrenceRule)
            return (
              <button
                key={r.label}
                onClick={() => setRecurrenceRule(r.rule)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition ${
                  selected
                    ? 'bg-sky-100 text-sky-700 border-sky-300 ring-2 ring-offset-1 ring-stone-300'
                    : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                }`}
              >
                <Repeat className="w-3 h-3" />
                {r.label}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-stone-500 font-semibold">
          Reminder
        </label>
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {REMINDER_PRESETS.map((r) => {
            const selected = reminderMin === r.value
            return (
              <button
                key={r.label}
                onClick={() => setReminderMin(r.value)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition ${
                  selected
                    ? 'bg-violet-100 text-violet-700 border-violet-300 ring-2 ring-offset-1 ring-stone-300'
                    : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                }`}
              >
                <Bell className="w-3 h-3" />
                {r.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!title.trim()}
          className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-medium"
        >
          Add to schedule
        </button>
      </div>
    </div>
  )
}

// ─── Edit dialog ────────────────────────────────────────────────────────────
function EditDialog({
  a,
  onCancel,
  onSaved,
}: {
  a: Activity
  onCancel: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(a.title)
  const [notes, setNotes] = useState(a.notes ?? '')
  const [category, setCategory] = useState<ActivityCategory>(a.category as ActivityCategory)
  const [date, setDate] = useState(a.date)
  const [time, setTime] = useState(timeHHMMFromISO(a.startTime))
  const [durationMin, setDurationMin] = useState(a.durationMin ?? 30)
  const [healingImpact, setHealingImpact] = useState<
    'helped' | 'neutral' | 'hinder' | 'unsure' | null
  >((a.healingImpact as any) ?? null)
  const [healingNote, setHealingNote] = useState(a.healingNote ?? '')
  const [status, setStatus] = useState(a.status)
  const [reminderMin, setReminderMin] = useState<number | null>(a.reminderMin ?? null)
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(
    decodeRule(a.recurrenceRule)
  )
  const isTemplate = a.isRecurrenceTemplate

  async function save() {
    const startTime = isoFromLocal(date, time)
    const endTime =
      status === 'completed'
        ? new Date(new Date(startTime).getTime() + durationMin * 60000).toISOString()
        : null
    await api(`/api/activities/${a.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: title.trim(),
        notes: notes.trim() || null,
        category,
        date,
        startTime,
        endTime,
        durationMin: status === 'completed' ? durationMin : null,
        status,
        healingImpact,
        healingNote: healingNote.trim() || null,
        reminderMin,
        // Only allow editing the rule itself on a template.
        ...(isTemplate ? { recurrenceRule } : {}),
      }),
    })
    onSaved()
  }

  async function remove() {
    // If it's a template, ask the user whether to delete future occurrences too.
    let url = `/api/activities/${a.id}`
    if (isTemplate && confirm('Delete this recurring activity AND all future planned occurrences?\nClick Cancel to keep future occurrences as standalone activities.')) {
      url += '?cascade=future'
    }
    await api(url, { method: 'DELETE' })
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-stone-800">Edit activity</h3>
          <button onClick={onCancel} className="text-stone-400 hover:text-stone-600">
            ✕
          </button>
        </div>
        <div className="p-5 space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            rows={2}
            className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-stone-500">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-200 px-2 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-stone-500">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-200 px-2 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-stone-500">Min</label>
              <input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-stone-200 px-2 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-stone-500 font-semibold">
              Category
            </label>
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {CATEGORY_LIST.map((c) => {
                const meta = CATEGORIES[c]
                const selected = category === c
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition ${
                      selected ? `${meta.chip} ring-2 ring-offset-1 ring-stone-300` : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                    <span>{meta.emoji}</span>
                    {meta.short}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-stone-500 font-semibold">
              Status
            </label>
            <div className="grid grid-cols-4 gap-1 mt-2">
              {(['planned', 'active', 'completed', 'skipped'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition ${
                    status === s
                      ? 'bg-stone-800 text-white border-stone-800'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {STATUS_LABELS[s].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-stone-500 font-semibold">
              Healing impact
            </label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => setHealingImpact(null)}
                className={`px-2 py-1.5 rounded-lg border text-xs ${
                  healingImpact === null
                    ? 'bg-stone-200 text-stone-700 border-stone-300'
                    : 'border-stone-200 text-stone-500'
                }`}
              >
                Not set
              </button>
              {HEALING_IMPACT_LIST.map((key) => {
                const h = HEALING_IMPACT[key]
                const selected = healingImpact === key
                return (
                  <button
                    key={key}
                    onClick={() => setHealingImpact(key)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition ${
                      selected ? `${h.chip} ring-2 ring-offset-1 ring-stone-300` : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <span>{h.emoji}</span>
                    {h.label}
                  </button>
                )
              })}
            </div>
          </div>
          <textarea
            value={healingNote}
            onChange={(e) => setHealingNote(e.target.value)}
            placeholder="Healing note"
            rows={2}
            className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
          />
          <div>
            <label className="text-xs uppercase tracking-wide text-stone-500 font-semibold">
              Reminder
            </label>
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {REMINDER_PRESETS.map((r) => {
                const selected = reminderMin === r.value
                return (
                  <button
                    key={r.label}
                    onClick={() => setReminderMin(r.value)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition ${
                      selected
                        ? 'bg-violet-100 text-violet-700 border-violet-300 ring-2 ring-offset-1 ring-stone-300'
                        : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                    <Bell className="w-3 h-3" />
                    {r.label}
                  </button>
                )
              })}
            </div>
          </div>
          {isTemplate && (
            <div>
              <label className="text-xs uppercase tracking-wide text-stone-500 font-semibold flex items-center gap-1">
                <Repeat className="w-3 h-3" /> Recurrence
              </label>
              <div className="mt-2 flex gap-1.5 flex-wrap">
                {RECURRENCE_PRESETS.map((r) => {
                  const selected =
                    recurrenceRule === null
                      ? r.rule === null
                      : r.rule !== null &&
                        JSON.stringify(r.rule) === JSON.stringify(recurrenceRule)
                  return (
                    <button
                      key={r.label}
                      onClick={() => setRecurrenceRule(r.rule)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition ${
                        selected
                          ? 'bg-sky-100 text-sky-700 border-sky-300 ring-2 ring-offset-1 ring-stone-300'
                          : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                      }`}
                    >
                      {r.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-stone-400 mt-2">
                Editing this recurring activity will update all future planned occurrences too.
              </p>
            </div>
          )}
          {!isTemplate && a.recurrenceTemplateId && (
            <p className="text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-lg p-2 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5" />
              Part of a recurring series — edits apply only to this occurrence.
            </p>
          )}
        </div>
        <div className="p-5 border-t border-stone-100 flex gap-2">
          <button
            onClick={remove}
            className="px-3 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Week view (schedule) ───────────────────────────────────────────────────
function WeekView() {
  const today = todayISODate()
  const [anchor, setAnchor] = useState(today)
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(anchor, i - ((new Date(anchor).getDay() + 6) % 7)))
  }, [anchor])
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-800">
          Week of {shortDate(days[0])}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setAnchor(addDays(anchor, -7))}
            className="px-3 py-2 rounded-lg border border-stone-200 hover:bg-stone-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAnchor(today)}
            className="px-3 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm"
          >
            Today
          </button>
          <button
            onClick={() => setAnchor(addDays(anchor, 7))}
            className="px-3 py-2 rounded-lg border border-stone-200 hover:bg-stone-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {days.map((d) => (
          <DayCard key={d} date={d} />
        ))}
      </div>
    </div>
  )
}

function DayCard({ date }: { date: string }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let stop = false
    api<{ activities: Activity[] }>(`/api/activities?date=${date}`)
      .then((d) => !stop && setActivities(d.activities))
      .catch(() => {})
    return () => {
      stop = true
    }
  }, [date])

  const planned = activities.filter((a) => a.status === 'planned')
  const done = activities.filter((a) => a.status === 'completed')
  const healingMin = activities
    .filter((a) => a.healingImpact === 'helped')
    .reduce((s, a) => s + (a.durationMin ?? 0), 0)

  const isToday = date === todayISODate()

  return (
    <div
      className={`rounded-2xl bg-white border p-4 ${
        isToday ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-stone-200/60'
      }`}
    >
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-500 font-semibold">
            {relativeDayLabel(date)}
          </p>
          <p className="text-sm text-stone-700">{shortDate(date)}</p>
        </div>
        <span className="text-xs text-stone-400">{activities.length} items</span>
      </div>
      <div className="mt-3 flex gap-3 text-xs">
        <span className="text-emerald-600 font-semibold">{healingMin} min healing</span>
        <span className="text-sky-600">{planned.length} planned</span>
        <span className="text-stone-500">{done.length} done</span>
      </div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-3 w-full text-sm text-stone-600 hover:text-stone-900 border border-stone-200 hover:bg-stone-50 rounded-lg py-1.5"
      >
        {open ? 'Hide' : 'Open'} day
      </button>
      {open && (
        <div className="mt-3">
          <DayView date={date} />
        </div>
      )}
    </div>
  )
}

// ─── Insights view ───────────────────────────────────────────────────────────
function InsightsView() {
  const today = todayISODate()
  const from = addDays(today, -13)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let stop = false
    api<any>(`/api/insights?from=${from}&to=${today}`)
      .then((d) => !stop && setData(d))
      .finally(() => !stop && setLoading(false))
    return () => {
      stop = true
    }
  }, [from, today])

  if (loading || !data) {
    return <div className="text-center text-stone-400 py-12 text-sm">Crunching your healing data…</div>
  }

  const maxCat = Math.max(1, ...Object.values(data.minutesByCategory).map((n: any) => Number(n)))
  const maxDay = Math.max(1, ...data.dailyTrend.map((d: any) => d.minutes))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Activities"
          value={data.totalActivities}
          hint="last 14 days"
          color="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          label="Total minutes"
          value={data.totalMinutes}
          hint={formatDuration(data.totalMinutes)}
          color="bg-teal-100 text-teal-700"
        />
        <StatCard
          label="Healing minutes"
          value={data.healingMinutes}
          hint={formatDuration(data.healingMinutes)}
          color="bg-amber-100 text-amber-700"
        />
        <StatCard
          label="Avg mood delta"
          value={data.avgMoodDelta ? (data.avgMoodDelta >= 0 ? '+' : '') + data.avgMoodDelta.toFixed(1) : '—'}
          hint="after − before"
          color="bg-violet-100 text-violet-700"
        />
      </div>

      <div className="rounded-3xl bg-white border border-stone-200/60 p-6">
        <h3 className="text-lg font-semibold text-stone-800 mb-1">Minutes by category</h3>
        <p className="text-xs text-stone-500 mb-4">Where your time has gone over the last 2 weeks</p>
        <div className="space-y-2">
          {Object.entries(data.minutesByCategory)
            .sort(([, a]: any, [, b]: any) => b - a)
            .map(([cat, minutes]: any) => {
              const meta = CATEGORIES[cat as ActivityCategory] ?? CATEGORIES.other
              const pct = (minutes / maxCat) * 100
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs w-20 shrink-0 flex items-center gap-1 text-stone-600">
                    <span>{meta.emoji}</span>
                    {meta.label}
                  </span>
                  <div className="flex-1 h-3 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className={`h-full ${meta.dot}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-stone-500 w-16 text-right">
                    {formatDuration(minutes)}
                  </span>
                </div>
              )
            })}
          {Object.keys(data.minutesByCategory).length === 0 && (
            <p className="text-sm text-stone-400">No data yet — start logging your days.</p>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-stone-200/60 p-6">
        <h3 className="text-lg font-semibold text-stone-800 mb-1">Daily healing minutes</h3>
        <p className="text-xs text-stone-500 mb-4">
          Time you marked as moving you <em>toward</em> healing, per day
        </p>
        <div className="flex items-end gap-1 h-32">
          {data.dailyTrend.map((d: any) => {
            const h = (d.healingMinutes / maxDay) * 100
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-emerald-400 to-teal-300 rounded-t-md"
                  style={{ height: `${h}%`, minHeight: d.healingMinutes > 0 ? '4px' : '0' }}
                  title={`${d.date}: ${d.healingMinutes} min`}
                />
                <span className="text-[10px] text-stone-400 -rotate-45 origin-top">
                  {d.date.slice(5)}
                </span>
              </div>
            )
          })}
          {data.dailyTrend.length === 0 && (
            <p className="text-sm text-stone-400 w-full text-center">No data yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-stone-200/60 p-6">
        <h3 className="text-lg font-semibold text-stone-800 mb-1">Healing impact</h3>
        <p className="text-xs text-stone-500 mb-4">How often activities have moved you toward (or away from) healing</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {HEALING_IMPACT_LIST.map((k) => {
            const h = HEALING_IMPACT[k]
            const count = (data.healingCounts as any)[k] ?? 0
            return (
              <div key={k} className={`rounded-2xl border ${h.chip} p-3 text-center`}>
                <div className="text-2xl">{h.emoji}</div>
                <div className="text-xl font-semibold mt-1">{count}</div>
                <div className="text-xs">{h.label}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-stone-800">A gentle nudge</h3>
            <p className="text-sm text-stone-600 mt-1">
              {data.healingMinutes === 0
                ? 'No healing minutes logged yet. Even five minutes of mindful breathing counts — start small.'
                : `You've logged ${formatDuration(data.healingMinutes)} that moved you toward healing in the last 14 days. Be tender with yourself.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  color,
}: {
  label: string
  value: number | string
  hint: string
  color: string
}) {
  return (
    <div className={`rounded-2xl p-4 border border-transparent ${color}`}>
      <div className="text-xs uppercase tracking-wide font-semibold opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="text-xs opacity-70 mt-0.5">{hint}</div>
    </div>
  )
}

// ─── End-of-day reflection modal ──────────────────────────────────────────────
// Opens when the EOD reminder fires (or when the user taps "Open now" in the
// reminder settings). Shows the day's activities with their healing impact and
// prompts the user to add an overall reflection note.
function EndOfDayReflectionModal({
  date,
  onClose,
}: {
  date: string
  onClose: () => void
}) {
  const { toast } = useToast()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [overallNote, setOverallNote] = useState('')
  const [overallImpact, setOverallImpact] = useState<
    'helped' | 'neutral' | 'hinder' | 'unsure'
  >('unsure')
  const [saved, setSaved] = useState(false)
  const [userEditedImpact, setUserEditedImpact] = useState(false)

  useEffect(() => {
    let stop = false
    api<{ activities: Activity[] }>(`/api/activities?date=${date}`)
      .then((d) => {
        if (!stop) setActivities(d.activities)
      })
      .finally(() => !stop && setLoading(false))
    return () => {
      stop = true
    }
  }, [date])

  // Pre-populate overall impact from majority of the day's activities.
  // We compute it from the loaded activities, but only use it as the "initial"
  // value — once the user picks an option themselves, we respect their choice.
  const suggestedImpact = useMemo(() => {
    if (activities.length === 0) return null
    const counts: Record<string, number> = {
      helped: 0,
      neutral: 0,
      hinder: 0,
      unsure: 0,
    }
    activities.forEach((a) => {
      if (a.healingImpact && a.healingImpact in counts) {
        counts[a.healingImpact] += 1
      }
    })
    const top = Object.entries(counts).sort(([, a], [, b]) => b - a)[0]
    if (top && top[1] > 0) return top[0] as 'helped' | 'neutral' | 'hinder' | 'unsure'
    return null
  }, [activities])

  const effectiveImpact = userEditedImpact ? overallImpact : (suggestedImpact ?? overallImpact)

  const completed = activities.filter((a) => a.status === 'completed')
  const plannedRemaining = activities.filter((a) => a.status === 'planned')
  const healingMinutes = activities
    .filter((a) => a.healingImpact === 'helped')
    .reduce((s, a) => s + (a.durationMin ?? 0), 0)

  async function saveReflection() {
    // Save the reflection as a special "End-of-day reflection" pseudo-activity
    // in the Insights view. We mark it as completed with a 0-minute duration
    // so it doesn't pollute the day's time totals but shows up as a reflection.
    await api('/api/activities', {
      method: 'POST',
      body: JSON.stringify({
        title: '🌙 End-of-day reflection',
        notes: overallNote.trim() || null,
        category: 'other',
        date,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        durationMin: 0,
        status: 'completed',
        healingImpact: effectiveImpact,
        healingNote: overallNote.trim() || null,
      }),
    })
    setSaved(true)
    toast({ title: 'Reflection saved', description: 'Be tender with yourself tonight.' })
    setTimeout(onClose, 1500)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gradient-to-b from-indigo-50/30 to-white rounded-3xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 bg-gradient-to-br from-indigo-500 to-violet-500 text-white rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-semibold">End-of-day reflection</h2>
                <p className="text-sm text-indigo-100">{formatPrettyDate(date)}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <p className="text-center text-stone-400 text-sm py-8">Loading your day…</p>
          ) : (
            <>
              {/* Day summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-emerald-50 p-3 text-center border border-emerald-100">
                  <div className="text-2xl font-bold text-emerald-700">{healingMinutes}</div>
                  <div className="text-xs text-emerald-600 mt-0.5">healing minutes</div>
                </div>
                <div className="rounded-2xl bg-stone-50 p-3 text-center border border-stone-100">
                  <div className="text-2xl font-bold text-stone-700">{completed.length}</div>
                  <div className="text-xs text-stone-500 mt-0.5">completed</div>
                </div>
                <div className="rounded-2xl bg-sky-50 p-3 text-center border border-sky-100">
                  <div className="text-2xl font-bold text-sky-700">{plannedRemaining.length}</div>
                  <div className="text-xs text-sky-600 mt-0.5">still planned</div>
                </div>
              </div>

              {/* Activity recap */}
              {activities.length === 0 ? (
                <p className="text-sm text-stone-500 text-center py-4">
                  Nothing was logged today. That's okay too — rest is part of healing.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activities.slice(0, 10).map((a) => {
                    const cat = CATEGORIES[a.category as ActivityCategory] ?? CATEGORIES.other
                    const h = a.healingImpact
                      ? HEALING_IMPACT[a.healingImpact as keyof typeof HEALING_IMPACT]
                      : null
                    return (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg bg-white border border-stone-100"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cat.dot} shrink-0`} />
                        <span className="flex-1 truncate text-stone-700">{a.title}</span>
                        {h && <span className="text-xs">{h.emoji}</span>}
                        {a.durationMin != null && a.durationMin > 0 && (
                          <span className="text-xs text-stone-400">
                            {formatDuration(a.durationMin)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                  {activities.length > 10 && (
                    <p className="text-xs text-stone-400 text-center pt-1">
                      +{activities.length - 10} more
                    </p>
                  )}
                </div>
              )}

              {/* Overall reflection */}
              <div>
                <label className="text-sm font-medium text-stone-700">
                  Overall, did today move you toward healing?
                </label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {HEALING_IMPACT_LIST.map((key) => {
                    const h = HEALING_IMPACT[key]
                    const selected = effectiveImpact === key
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setUserEditedImpact(true)
                          setOverallImpact(key)
                        }}
                        className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl border text-xs font-medium transition ${
                          selected
                            ? `${h.chip} ring-2 ring-offset-1 ring-stone-300`
                            : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        <span className="text-xl">{h.emoji}</span>
                        {h.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-stone-700">
                  A gentle note to your future self (optional)
                </label>
                <textarea
                  value={overallNote}
                  onChange={(e) => setOverallNote(e.target.value)}
                  rows={3}
                  placeholder="What do you want to remember about today? What did you notice? What might you try tomorrow?"
                  className="mt-2 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                />
              </div>

              {saved ? (
                <div className="text-center text-emerald-600 font-medium py-4">
                  🌙 Saved. Rest well.
                </div>
              ) : (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50"
                  >
                    Not now
                  </button>
                  <button
                    onClick={saveReflection}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium"
                  >
                    Save reflection
                  </button>
                </div>
              )}

              <p className="text-xs text-stone-400 text-center">
                You can also revisit this reflection any time from Insights → Healing impact.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

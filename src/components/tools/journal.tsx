'use client'

// Journal section — write entries, get gentle AI reframes, and look back with
// weekly reflections. Ported from Healing Companion; storage is the app database.

import { useCallback, useEffect, useState } from 'react'
import { Loader2, NotebookPen, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  JournalEntry,
  ReframeResult,
  createJournalEntry,
  deleteJournalEntry,
  humanizePattern,
  listJournalEntries,
  parseReframe,
  postReframe,
  updateJournalEntry,
} from '@/lib/journal'
import { DEFAULT_MEMORY, getMemory, setMemory } from '@/lib/recovery-memory'
import {
  WeeklyReflection,
  generateReflection,
  listReflections,
} from '@/lib/weekly-reflection'

const inputCls =
  'w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none'

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDay(ms: number): string {
  return new Date(ms).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatWeek(weekOf: string): string {
  return new Date(`${weekOf}T12:00:00`).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })
}

// ─── Section ─────────────────────────────────────────────────────────────────

export function JournalSection() {
  const { toast } = useToast()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [text, setText] = useState('')
  const [skipScan, setSkipScan] = useState(false)
  const [saving, setSaving] = useState(false)

  const [memoryOpen, setMemoryOpen] = useState(false)
  const [memoryDraft, setMemoryDraft] = useState('')

  const [reflections, setReflections] = useState<WeeklyReflection[]>([])
  const [weeklyBusy, setWeeklyBusy] = useState(false)
  const [weeklyError, setWeeklyError] = useState<string | null>(null)

  const loadEntries = useCallback(async () => {
    try {
      setEntries(await listJournalEntries())
    } catch (e) {
      console.error('could not load journal entries', e)
    } finally {
      setLoadingEntries(false)
    }
  }, [])

  const loadReflections = useCallback(async () => {
    try {
      setReflections(await listReflections())
    } catch (e) {
      console.error('could not load reflections', e)
    }
  }, [])

  useEffect(() => {
    void loadEntries()
    void loadReflections()
  }, [loadEntries, loadReflections])

  // ── Save + scan ────────────────────────────────────────────────────────────

  async function scan(entry: JournalEntry) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entry.id ? { ...e, reframeStatus: 'pending', reframeError: null } : e
      )
    )
    const res = await postReframe(entry.text, getMemory())
    if (res.ok && res.data) {
      const reframe: ReframeResult = {
        pattern: String(res.data.pattern ?? 'none'),
        summary: String(res.data.summary ?? ''),
        suggestion: String(res.data.suggestion ?? ''),
        fetchedAt: Date.now(),
      }
      try {
        const updated = await updateJournalEntry(entry.id, {
          reframeJson: JSON.stringify(reframe),
          reframeStatus: 'done',
          reframeError: null,
        })
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? updated : e)))
      } catch (e) {
        console.error('could not store reframe result', e)
      }
    } else {
      const msg = res.error || 'Unknown error'
      if (/not configured/i.test(msg)) {
        toast({
          title: "The AI isn't connected yet.",
          description: 'It needs an API key on the host. Your entry is still saved.',
        })
      } else {
        toast({ title: "Couldn't scan that entry.", description: msg })
      }
      try {
        const updated = await updateJournalEntry(entry.id, {
          reframeStatus: 'error',
          reframeError: msg,
        })
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? updated : e)))
      } catch (e) {
        console.error('could not store scan error', e)
      }
    }
  }

  async function submit() {
    const t = text.trim()
    if (t.length < 3) {
      toast({ title: 'Write a little more first.' })
      return
    }
    if (t.length > 4000) {
      toast({ title: "That's over 4000 characters — shorten it for the scan." })
      return
    }
    setSaving(true)
    try {
      const entry = await createJournalEntry({ text: t, skipScan })
      setEntries((prev) => [entry, ...prev])
      setText('')
      toast({
        title: 'Saved.',
        description: skipScan ? 'Not scanned.' : 'Scanning for patterns…',
      })
      if (!skipScan) void scan(entry)
    } catch (e) {
      console.error(e)
      toast({ title: "Couldn't save that", description: 'Try again in a moment.' })
    } finally {
      setSaving(false)
    }
  }

  async function remove(entry: JournalEntry) {
    if (!window.confirm('Delete this journal entry?')) return
    try {
      await deleteJournalEntry(entry.id)
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))
      toast({ title: 'Entry deleted' })
    } catch (e) {
      console.error(e)
      toast({ title: "Couldn't delete it", description: 'Try again in a moment.' })
    }
  }

  // ── Recovery memory ────────────────────────────────────────────────────────

  function openMemory() {
    setMemoryDraft(getMemory())
    setMemoryOpen(true)
  }

  function saveMemory() {
    setMemory(memoryDraft.trim() || DEFAULT_MEMORY)
    setMemoryOpen(false)
    toast({ title: 'Memory saved', description: 'New scans will follow it.' })
  }

  // ── Weekly reflection ──────────────────────────────────────────────────────

  async function generateWeekly() {
    setWeeklyBusy(true)
    setWeeklyError(null)
    const res = await generateReflection(getMemory())
    setWeeklyBusy(false)
    if (res.ok && res.reflection) {
      const reflection = res.reflection
      setReflections((prev) => [
        reflection,
        ...prev.filter((r) => r.weekOf !== reflection.weekOf),
      ])
      toast({ title: 'Reflection ready', description: 'A gentle look back at your week.' })
    } else {
      setWeeklyError(res.error || 'Something went wrong.')
    }
  }

  return (
    <>
      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-500 uppercase tracking-wide">
            <NotebookPen className="w-4 h-4" />
            Journal
          </h3>
          <button
            onClick={openMemory}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            AI memory
          </button>
        </div>

        {/* Write box */}
        <div className="rounded-2xl border border-stone-200/60 bg-white p-4">
          <textarea
            className={`${inputCls} min-h-[110px] bg-stone-50/50`}
            placeholder="What's on your mind? The AI will gently scan for thinking patterns when you save."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={4000}
          />
          <div className="mt-3 flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-xs text-stone-500 cursor-pointer">
              <input
                type="checkbox"
                checked={skipScan}
                onChange={(e) => setSkipScan(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-stone-300 accent-emerald-500"
              />
              Skip AI scan (just save it)
            </label>
            <button
              onClick={submit}
              disabled={saving || text.trim().length < 3}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Weekly reflection */}
        <div className="mt-3">
          <WeeklyCard
            reflections={reflections}
            busy={weeklyBusy}
            error={weeklyError}
            onGenerate={generateWeekly}
          />
        </div>

        {/* Entries */}
        <div className="mt-5">
          {loadingEntries ? (
            <p className="text-xs text-stone-400">Loading entries…</p>
          ) : entries.length === 0 ? (
            <p className="text-xs text-stone-400">
              No journal entries yet. Whatever&apos;s on your mind — it&apos;s a good place to put it.
            </p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onDelete={() => remove(entry)}
                  onRetry={() => void scan(entry)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Recovery memory sheet ───────────────────────────────────────────── */}
      <Sheet open={memoryOpen} onOpenChange={setMemoryOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl"
        >
          <SheetHeader>
            <SheetTitle>AI recovery plan memory</SheetTitle>
            <SheetDescription>
              This tells the AI how to respond to your journal entries. Edit it with your
              therapist. Stored on this device, not shared.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            <textarea
              className="w-full min-h-[240px] rounded-xl border border-stone-200 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
              value={memoryDraft}
              onChange={(e) => setMemoryDraft(e.target.value)}
            />
          </div>

          <div className="p-4 flex gap-2">
            <button
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition text-sm"
              onClick={() => {
                setMemoryDraft(DEFAULT_MEMORY)
                toast({ title: 'Reset to default. Tap Save to apply.' })
              }}
            >
              Reset
            </button>
            <button
              className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition text-sm"
              onClick={() => setMemoryOpen(false)}
            >
              Cancel
            </button>
            <button
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition text-sm"
              onClick={saveMemory}
            >
              Save
            </button>
          </div>

          <p className="px-4 pb-4 text-center text-xs text-stone-400">
            Changes apply to new journal scans. Past entries aren&apos;t re-scanned
            automatically.
          </p>
        </SheetContent>
      </Sheet>
    </>
  )
}

// ─── Entry card ──────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  onDelete,
  onRetry,
}: {
  entry: JournalEntry
  onDelete: () => void
  onRetry: () => void
}) {
  const status = entry.reframeStatus
  const reframe = parseReframe(entry)

  return (
    <div className="rounded-2xl border border-stone-200/60 bg-white px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs text-stone-400">{formatWhen(entry.createdAt)}</p>
        <button
          onClick={onDelete}
          aria-label="Delete journal entry"
          title="Delete"
          className="rounded-md p-1 text-stone-300 transition hover:bg-rose-50 hover:text-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-700">
        {entry.text}
      </p>

      {status === 'pending' && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-stone-200 bg-stone-50/60 px-3 py-2 text-xs text-stone-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Scanning for thinking patterns…
        </div>
      )}

      {status === 'error' && (
        <div className="mt-2 rounded-xl border border-dashed border-rose-200 bg-rose-50/50 px-3 py-2 text-xs text-stone-500">
          {entry.reframeError && /not configured/i.test(entry.reframeError)
            ? 'AI isn\u2019t connected yet — it needs a key on the host. Your entry is still saved.'
            : entry.reframeError || 'Couldn\u2019t reach the AI just now. The entry is still saved.'}
          <button
            onClick={onRetry}
            className="mt-1.5 block text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            Try scanning again
          </button>
        </div>
      )}

      {status === 'done' && reframe && reframe.pattern !== 'none' && (
        <div className="mt-2 rounded-xl border-l-2 border-l-emerald-400 bg-emerald-50/60 px-3 py-2">
          <p className="text-xs font-medium text-emerald-700">
            Pattern flagged: {humanizePattern(reframe.pattern)}
          </p>
          {reframe.summary && (
            <p className="mt-0.5 text-xs text-stone-500">{reframe.summary}</p>
          )}
          {reframe.suggestion && (
            <p className="mt-1.5 text-sm italic text-stone-700">
              &ldquo;{reframe.suggestion}&rdquo;
            </p>
          )}
        </div>
      )}

      {status === 'done' && reframe && reframe.pattern === 'none' && (
        <p className="mt-2 text-xs text-stone-400">
          {reframe.summary ? reframe.summary : 'No pattern flagged.'}
        </p>
      )}
    </div>
  )
}

// ─── Weekly reflection card ──────────────────────────────────────────────────

function WeeklyCard({
  reflections,
  busy,
  error,
  onGenerate,
}: {
  reflections: WeeklyReflection[]
  busy: boolean
  error: string | null
  onGenerate: () => void
}) {
  const latest = reflections[0] ?? null

  return (
    <div className="rounded-2xl border border-stone-200/60 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          Weekly reflection
        </p>
        {latest && (
          <span className="text-[10px] text-stone-400">
            last: {formatDay(latest.generatedAt)}
          </span>
        )}
      </div>

      {busy ? (
        <div className="mt-2 flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Reading your week…
        </div>
      ) : error ? (
        <div className="mt-2">
          <p className="text-sm text-stone-600">
            {/not configured/i.test(error)
              ? 'The AI isn\u2019t connected yet — add a key on the host, then try again.'
              : error}
          </p>
          <button
            onClick={onGenerate}
            className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            Try again
          </button>
        </div>
      ) : latest ? (
        <>
          <p className="mt-1 text-xs text-stone-400">Week of {formatWeek(latest.weekOf)}</p>

          {latest.patterns.length > 0 && (
            <ul className="mt-2 ml-4 list-disc space-y-1">
              {latest.patterns.map((p, i) => (
                <li key={i} className="text-sm text-stone-700">
                  {p}
                </li>
              ))}
            </ul>
          )}

          {latest.moodSummary && (
            <p className="mt-2 text-sm text-stone-600">{latest.moodSummary}</p>
          )}

          {latest.topReframes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {latest.topReframes.map((r, i) => (
                <span
                  key={i}
                  className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
                >
                  {humanizePattern(r.pattern)} &times; {r.count}
                </span>
              ))}
            </div>
          )}

          {latest.suggestion && (
            <div className="mt-3 rounded-xl border-l-2 border-l-emerald-400 bg-emerald-50/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-emerald-700">
                One small thing to try
              </p>
              <p className="mt-1 text-sm italic text-stone-700">{latest.suggestion}</p>
            </div>
          )}

          <button
            onClick={onGenerate}
            className="mt-3 text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            Regenerate this week
          </button>

          {reflections.length > 1 && (
            <details className="mt-3 border-t border-stone-100 pt-3">
              <summary className="cursor-pointer text-xs text-stone-400 uppercase tracking-wider">
                Past reflections ({reflections.length - 1})
              </summary>
              <div className="mt-2 space-y-2">
                {reflections.slice(1).map((r) => (
                  <div key={r.weekOf} className="rounded-xl bg-stone-50 px-3 py-2">
                    <p className="text-xs text-stone-400">Week of {formatWeek(r.weekOf)}</p>
                    {r.suggestion && (
                      <p className="mt-1 text-sm italic text-stone-600">{r.suggestion}</p>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-stone-500">
            Once a week, get a gentle one-paragraph reflection on your journal, check-ins
            and activities from the past 7 days — plus one small thing to try.
          </p>
          <button
            onClick={onGenerate}
            className="mt-3 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition"
          >
            Generate this week&apos;s reflection
          </button>
        </>
      )}
    </div>
  )
}

'use client'

// Cue cards — short present-moment reminders, ported from Healing Companion.
// Saved cards live in the database; the starter deck ships in the client.

import { useCallback, useEffect, useState } from 'react'
import { Pencil, StickyNote } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { api } from '@/lib/api'
import { CueCard, MAX_CARDS, STARTER_CARDS } from '@/lib/cue-cards'

const inputCls =
  'w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none'

export function CueCardsSection() {
  const { toast } = useToast()
  const [cards, setCards] = useState<CueCard[]>([])
  const [startersOpen, setStartersOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<CueCard | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api<{ cueCards: CueCard[] }>('/api/cue-cards')
      setCards(data.cueCards)
    } catch (e) {
      console.error('could not load cue cards', e)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function openEditor(card: CueCard | null) {
    setEditing(card)
    setDraft(card?.text ?? '')
    setEditorOpen(true)
  }

  async function addStarter(text: string) {
    setBusy(true)
    try {
      await api('/api/cue-cards', { method: 'POST', body: JSON.stringify({ text }) })
      toast({ title: 'Added to your deck' })
      await load()
    } catch (e) {
      console.error(e)
      toast({ title: 'Could not add it', description: 'Try again in a moment.' })
    } finally {
      setBusy(false)
    }
  }

  async function saveEditor() {
    const text = draft.trim()
    if (!text || busy) return
    setBusy(true)
    try {
      if (editing) {
        await api(`/api/cue-cards/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ text }),
        })
      } else {
        await api('/api/cue-cards', { method: 'POST', body: JSON.stringify({ text }) })
      }
      toast({ title: editing ? 'Card updated' : 'Card added' })
      setEditorOpen(false)
      setEditing(null)
      setDraft('')
      await load()
    } catch (e) {
      console.error(e)
      toast({ title: 'Could not save', description: 'Try again in a moment.' })
    } finally {
      setBusy(false)
    }
  }

  async function deleteCard() {
    if (!editing || busy) return
    setBusy(true)
    try {
      await api(`/api/cue-cards/${editing.id}`, { method: 'DELETE' })
      toast({ title: 'Card deleted' })
      setEditorOpen(false)
      setEditing(null)
      setDraft('')
      await load()
    } catch (e) {
      console.error(e)
      toast({ title: 'Could not delete it', description: 'Try again in a moment.' })
    } finally {
      setBusy(false)
    }
  }

  const full = cards.length >= MAX_CARDS

  return (
    <>
      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-500 uppercase tracking-wide">
            <StickyNote className="w-4 h-4" />
            Cue cards
          </h3>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setStartersOpen(true)}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Browse starters
            </button>
            <button
              onClick={() => openEditor(null)}
              disabled={full}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-40"
            >
              + Add card
            </button>
          </div>
        </div>
        <p className="text-xs text-stone-500 mb-3">
          Short reminders for the hard moments. Write your own, or pick from{' '}
          {STARTER_CARDS.length} ready-made starters.
        </p>

        {cards.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-stone-200 p-6 text-center">
            <p className="text-sm text-stone-500">
              No cue cards yet. Tap &ldquo;Browse starters&rdquo; or &ldquo;Add card&rdquo; to
              write one.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {cards.map((c) => (
              <button
                key={c.id}
                onClick={() => openEditor(c)}
                className="w-full flex items-center gap-3 rounded-2xl border border-stone-200/60 bg-white px-4 py-3 text-left transition hover:bg-emerald-50/50"
              >
                <p className="flex-1 text-sm italic text-stone-700">{c.text}</p>
                <Pencil className="w-3.5 h-3.5 text-stone-300 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Starters sheet ───────────────────────────────────────────────── */}
      <Sheet open={startersOpen} onOpenChange={setStartersOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl"
        >
          <SheetHeader>
            <SheetTitle>Starter cue cards</SheetTitle>
            <SheetDescription>
              Ready-made reminders for the hard moments. Tap one to add it, then edit it to
              sound like you.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            <div className="space-y-2">
              {STARTER_CARDS.map((s) => {
                const added = cards.some((c) => c.text === s.text)
                const disabled = added || full || busy
                return (
                  <button
                    key={s.id}
                    disabled={disabled}
                    onClick={() => addStarter(s.text)}
                    className={
                      'w-full rounded-2xl border px-4 py-3 text-left transition ' +
                      (disabled
                        ? 'border-stone-200/60 bg-stone-50/50'
                        : 'border-stone-200/60 bg-white hover:bg-emerald-50/50')
                    }
                  >
                    <p className="text-sm italic text-stone-700">{s.text}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-stone-400">
                      {added ? 'Added' : full ? 'Deck is full' : 'Tap to add'}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="p-4">
            <button
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
              onClick={() => setStartersOpen(false)}
            >
              Done
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Editor sheet ─────────────────────────────────────────────────── */}
      <Sheet
        open={editorOpen}
        onOpenChange={(v) => {
          setEditorOpen(v)
          if (!v) setEditing(null)
        }}
      >
        <SheetContent side="bottom" className="mx-auto w-full max-w-md rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit cue card' : 'New cue card'}</SheetTitle>
            <SheetDescription>
              A short reminder to yourself. Read it when you need it.
            </SheetDescription>
          </SheetHeader>

          <div className="px-4">
            <textarea
              className={`${inputCls} min-h-[120px] bg-stone-50/50`}
              placeholder="e.g. I am here, in this room, in this body, right now."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              maxLength={200}
            />
            <p className="mt-2 text-xs text-stone-400">
              {draft.length}/200 characters. Keep it short so it sticks.
            </p>
          </div>

          <div className="p-4 flex gap-2">
            {editing && (
              <button
                onClick={deleteCard}
                disabled={busy}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-rose-500 hover:bg-rose-50 disabled:opacity-60 transition"
              >
                Delete
              </button>
            )}
            <button
              className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
              onClick={() => {
                setEditorOpen(false)
                setEditing(null)
              }}
            >
              Cancel
            </button>
            <button
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition"
              onClick={saveEditor}
              disabled={!draft.trim() || busy}
            >
              Save
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

# MERGE GUIDE — Tender Hours × Healing Companion (Phases 1–2)

This copy of Tender Hours has the first two batches of Healing Companion
merged in: **Phase 1** — the self-contained toolkit — and **Phase 2** — the
journal and AI heart. It runs, it's tested, and it's ready to be reviewed,
tried, and merged back into your repo.

Everything new lives behind the **Tools** tab. Nothing that you already track
changed: activities, schedule, reminders, insights all behave exactly as
before.

---

## Run it

```bash
# from this folder (tender-hours-merge/app)
npm install        # (already done here; skip if node_modules exists)
npm run dev        # opens on http://localhost:3000
```

There's also a built copy currently serving at **http://localhost:3001**
(from `.next/standalone`), if you want to click around right away.

**Database:** this working copy is set up for a local SQLite file (`.env` →
`DATABASE_URL="file:./dev.db"`, schema provider = `sqlite`, tables already
created). `npm run db:push` re-creates them any time.

> Heads-up: in your repo, **both** `prisma/schema.prisma` and
> `prisma/schema.postgres.prisma` currently say `provider = "postgresql"`
> (the README's "SQLite default" no longer matches). This copy restores the
> README's intended layout:
> - `prisma/schema.prisma` → **sqlite** (for local dev, used here)
> - `prisma/schema.postgres.prisma` → **postgres** (for Vercel / Postgres hosts)
>
> When you merge, keep whichever provider your deployment uses, and make sure
> the **four new models** are present (`CheckIn`, `CueCard`, `JournalEntry`,
> `Reflection`). Both schema files here already include them.

**AI features:** the journal scan and weekly reflection use any
OpenAI-compatible provider — set `OPENAI_API_KEY` on the host (locally in
`.env`), and optionally `OPENAI_BASE_URL` + `OPENAI_MODEL` for Groq, Gemini,
OpenRouter, Together, etc. — the same setup you used with Healing Companion.
Without a key, the features say so plainly; entries still save.

---

## What's new

### Phase 1 — the toolkit

| Section | What it does | Storage |
|---|---|---|
| **Check in** | Mood log (1–5 + note), the healing check ("Does this move me toward healing?" — yes / no / skip + note), one-tap "I moved" | Database (`CheckIn`) |
| **Move nudge** | Optional hourly "time to move" reminder; enable button, on/off toggle, next-nudge time, "send a test nudge" | Preference on device; browser Notification API |
| **Grounding tools** | 5-4-3-2-1 senses, box breathing (animated ring), TIPP reference, cold-water cue (60s timer) | None — stateless UI |
| **Right now — a DBT skill** | Picks a skill from what you're currently doing (or time of day); "See all 13 skills" | None |
| **Cue cards** | Short present-moment reminders; 20 ready-made starters; add / edit / delete; deck cap 24 | Database (`CueCard`) |

### Phase 2 — journal + AI heart

| Section | What it does | Storage |
|---|---|---|
| **Journal** | Write entries; on save the AI gently scans for thinking patterns and shows an opt-in reframe card ("Pattern flagged: …" + one alternative thought). "Skip AI scan" saves without scanning; scan errors show plainly with a retry; entries deletable | Database (`JournalEntry`) |
| **Weekly reflection** | A gentle one-paragraph look back at the past 7 days — reads journal + check-ins + activities together (an upgrade over the standalone version), regenerable anytime, past weeks kept | Database (`Reflection`) |
| **AI memory** | The editable instruction set behind the scans (the one to review with your therapist). Device-only, not shared | This device |

---

## Files added / changed

**Added — Phase 1**
```
src/app/api/checkins/route.ts · src/app/api/checkins/[id]/route.ts
src/app/api/cue-cards/route.ts · src/app/api/cue-cards/[id]/route.ts
src/components/tools/tools-view.tsx · checkin.tsx · grounding.tsx · cue-cards.tsx · dbt-card.tsx
src/lib/api.ts · checkins.ts · cue-cards.ts · dbt-skills.ts · chime.ts
src/hooks/use-hourly-move-nudge.ts
public/chime.wav
```

**Added — Phase 2**
```
src/app/api/journal/route.ts · src/app/api/journal/[id]/route.ts
src/app/api/reframe/route.ts · src/app/api/weekly-reflection/route.ts
src/components/tools/journal.tsx
src/lib/ai-json.ts · journal.ts · recovery-memory.ts · weekly-reflection.ts
```

**Changed**
```
src/app/page.tsx                 # + Tools tab (import, Tab type, tab bar, render)
src/components/tools/tools-view.tsx  # + JournalSection
prisma/schema.prisma             # + CheckIn, CueCard, JournalEntry, Reflection
prisma/schema.postgres.prisma    # same models
package.json                     # + openai (dependency for the AI routes)
```

**When merging into your repo:** copy the added files as-is; diff `page.tsx`
and `tools-view.tsx` against your versions (small, localized changes); copy
the four new models into your schema file(s). The database updates itself on
deploy now — the build runs a safe schema sync (`scripts/ci-db-sync.mjs`), so
new tables are created automatically. You can still run `db:push` manually
any time.

---

## How to modify things later

- **Copy / wording** — everything user-visible lives in the component files
  under `src/components/tools/`. Nudge text is `MOVE_NUDGE_BODY` in
  `src/hooks/use-hourly-move-nudge.ts`; starter cards in `src/lib/cue-cards.ts`.
- **AI behavior** — the two prompts live in `src/app/api/reframe/route.ts`
  and `src/app/api/weekly-reflection/route.ts`. The personal tone rules live
  in **AI memory** (`src/lib/recovery-memory.ts` holds the default).
- **Provider / model** — `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`.
- **DBT matching rules** — plain keyword lists at the top of
  `src/lib/dbt-skills.ts`.
- **Weekly reflection window** — the 7-day lookback is in
  `src/app/api/weekly-reflection/route.ts`.

---

## Verification done (and not done)

Verified in this working copy:
- `next build` passes; TypeScript clean across the new code
- Live click-through (automated browser): mood/healing/move check-ins persist;
  box breathing runs; cue card added/edited; **journal entry saved and the
  full scan lifecycle exercised** (pending → the real "no key" error state →
  a stored reframe result); AI memory sheet edited; weekly reflection card
  rendered with real data; all persisted across reloads
- The no-key error paths were exercised for real — the app says "The AI isn't
  connected yet" and keeps the entry, on both journal and weekly flows
- Rendered at desktop (1280px) and phone (390px) widths; all five tabs fit a
  390px screen; light and dark mode both correct

Not verified here (needs your real setup):
- An actual live AI response — needs `OPENAI_API_KEY` on the host (identical
  to how Healing Companion worked). The routes, prompts, parsing and storage
  are ports of code that already ran in production for you.
- Notification delivery (grant/deny flow, real nudge firing) — test on your
  device after deploying; use "Send a test nudge".

---

## Next up

Phase 3 is optional polish (check-ins in Insights, PWA shortcut for Tools,
quiet hours for the nudge) and Phase 4 is optional depth (background push,
cross-device sync) — see `../MERGE-PLAN.md`.

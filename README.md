# Tender Hours

> A gentle schedule for healing.

Track what you're doing, how long it lasted, and whether it moved you toward healing. A soft, personal schedule for your healing journey — built around the things you actually do each day, with reminders, recurring activities, daily check-ins, and an end-of-day reflection.

Installable as a PWA — runs as a real app on your phone or desktop, with notifications that fire even when your browser is closed.

---

## What it does

- **Now tab** — A live "what are you doing right now?" tracker with a real-time timer. Pick a category, set your mood, hit Start. When you finish, hit **End & Reflect** to record whether it moved you toward healing and how you felt after.
- **Today tab** — Full day view of everything planned, in-progress, or completed. Add planned activities, start them, mark done, skip, edit, or delete anything.
- **Schedule tab** — 7-day week view. Click any day to plan or tweak activities for that day.
- **Insights tab** — Last 14 days at a glance: minutes by category, daily healing-minutes trend, healing-impact breakdown, mood delta.

### Reminders
- **Per-activity reminders** — set 5/10/15/30 min before, at start, or 1 hour before
- **Daily check-in reminder** — gentle morning nudge at a time you choose
- **End-of-day reflection** — opens a calming modal that recaps your day and asks "What moved you toward healing?"
- **Snooze / dismiss** pending reminders from the bell icon in the header

### Recurring activities
- Doesn't repeat · Daily · Weekdays (Mon–Fri) · Weekly · Every 2 weeks · Monthly
- Editing a template propagates changes to future planned occurrences
- Editing a single occurrence only changes that one

### PWA
- Installable as a native app on Brave, Chrome, Edge, Android, iPhone/iPad
- Custom icon, splash screen, full-screen standalone mode
- Service worker with offline caching
- App shortcuts (long-press home screen icon on Android): Now / Today / Insights

---

## Tech stack

- **Next.js 16** with App Router, TypeScript
- **Tailwind CSS 4** + **shadcn/ui** component library
- **Prisma ORM** with **SQLite** (local dev) — see deployment notes for production
- **Zustand** for client state, TanStack-style polling for server state
- **Web Notifications API** + **Service Worker API** for PWA + reminders

---

## Run it locally

### Prerequisites

- **Node.js 20+** and **Bun** (or npm/pnpm/yarn — Bun is what this repo uses)
- No database setup needed — Prisma uses a local SQLite file

### Steps

```bash
# 1. Install dependencies
bun install

# 2. Copy the env file
cp .env.example .env
# (or just create .env with: DATABASE_URL="file:/home/z/my-project/db/custom.db")

# 3. Create the database
bun run db:push

# 4. Start the dev server
bun run dev
```

Open http://localhost:3000.

### Useful scripts

```bash
bun run dev      # Start dev server on port 3000
bun run lint     # Run ESLint
bun run db:push  # Push schema changes to the database
```

### Regenerate the app icons

If you want to tweak the icon (it's a Python script using Pillow):

```bash
python3 scripts/generate-icons.py
```

This regenerates all the PNG icons in `public/` (icon-192, icon-512, maskable variants, apple-touch-icon, favicons).

---

## Deploy it

Tender Hours uses Prisma + SQLite by default. Two main deployment paths:

### Path A — Railway (simplest, recommended)

[Railway](https://railway.app) gives you a persistent volume so the SQLite file survives restarts. The free trial is enough to try it; the $5/month hobby plan is plenty for a personal app.

1. **Push this repo to GitHub** (see "Push to GitHub" below).
2. Go to [railway.app/new](https://railway.app/new) and pick **Deploy from GitHub repo**.
3. Select your Tender Hours repo.
4. Railway auto-detects Next.js. Add a **Persistent Volume** mounted at `/data`.
5. Set the env var:
   ```
   DATABASE_URL=file:/data/tender-hours.db
   ```
6. Set the start command to push the schema before running:
   ```
   bun run db:push && bun run dev
   ```
   (For production, use `bun run build && bun run start` instead — see below.)
7. Railway gives you a public URL like `tender-hours.up.railway.app`. Open it, install as PWA, done.

**Or click the button** (after you've pushed to GitHub):

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

### Path B — Vercel (free, but requires Postgres)

Vercel's serverless environment doesn't have persistent filesystem storage, so SQLite won't work there. Use Vercel Postgres instead:

1. **Switch the Prisma schema to Postgres.** This repo ships with a Postgres-ready schema:
   ```bash
   cp prisma/schema.postgres.prisma prisma/schema.prisma
   ```
   Commit this change before pushing to GitHub.

2. **Create an empty GitHub repo** (see "Push to GitHub" below), then push.

3. **Import the repo on Vercel.** Go to [vercel.com/new](https://vercel.com/new), pick your GitHub repo. Vercel auto-detects Next.js — defaults are fine.

4. **Add a Vercel Postgres database.** In your Vercel project dashboard → **Storage** tab → **Create Database** → **Postgres** (free tier). Once created, Vercel auto-injects the connection string into your project's env vars as `POSTGRES_URL`. To keep our existing code happy, also add an env var named `DATABASE_URL` with the same value (Vercel shows you the connection string in the database's `.env.local` tab — copy that).

5. **Build settings.** Make sure Vercel's "Build Command" is `next build` and "Install Command" is `bun install` (or `npm install` — both work).

6. **Create the database tables.** Run this once locally with `DATABASE_URL` set to the production Postgres connection string:
   ```bash
   DATABASE_URL="postgres://..." bun run db:push
   ```
   This creates the `Activity` table in your Vercel Postgres instance. You only need to run this once.

7. **Deploy.** Back on Vercel, hit **Redeploy** (or push any new commit to GitHub — Vercel auto-deploys on every push to `main`).

8. **Open the deployed URL.** Vercel gives you a URL like `tender-hours.vercel.app`. Open it, install as a PWA (instructions below), and you're live.

#### Vercel gotchas

- **Vercel's free hobby tier** includes a free Postgres database (60 hours of compute credits / month, 256 MB Postgres storage). That's plenty for a personal app.
- **Cold starts:** Vercel serverless functions spin down after ~15 min of inactivity. The first request after that takes ~1-2 seconds. Subsequent requests are fast. For a PWA you're opening throughout the day, you'll rarely hit cold starts.
- **Don't commit `.env` or `db/custom.db`.** The `.gitignore` already excludes both.

### Path C — Render, Fly.io, self-hosted

Any host with a persistent volume + Node.js works. Same pattern as Railway: mount a volume, set `DATABASE_URL` to a path on it, push the schema, start the server.

---

## Push to GitHub

If you're starting from a fresh clone or download:

```bash
# 1. Create an empty repo on GitHub first (no README, no .gitignore — we have both)
#    Go to https://github.com/new and create one. Don't initialize it.

# 2. From your local Tender Hours directory:
git init                          # if not already initialized
git add .
git commit -m "Initial commit: Tender Hours — a gentle schedule for healing"

# 3. Add your GitHub repo as the remote and push:
git remote add origin https://github.com/YOUR-USERNAME/tender-hours.git
git branch -M main
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username.

---

## Install as a PWA

### Brave / Chrome / Edge (desktop)
1. Open the deployed URL in your browser.
2. Click the install icon in the address bar (looks like a monitor with a down arrow), or open the browser menu and choose **Install Tender Hours…**
3. Confirm. Tender Hours opens in its own window and adds an icon to your dock / taskbar.
4. On Brave: make sure **Settings → Privacy and security → "Use Google services to push messages"** is enabled.

### Android
1. Open the deployed URL in Brave or Chrome.
2. Tap the **Install** button at the top of the page, or open the browser menu (⋮) → **Install app**.
3. Confirm. The icon appears in your app drawer and on your home screen.
4. Notifications fire even when the browser is closed.

### iPhone / iPad (iOS 16.4+)
1. Open the deployed URL in **Safari** (not Chrome or Brave — iOS only allows web push from Safari-installed PWAs).
2. Tap the **Share** button (square with up arrow at the bottom of Safari).
3. Scroll down and tap **Add to Home Screen**, then tap **Add**.
4. The Tender Hours icon appears on your home screen. Open it from there to enable notifications.

### Enable notifications after installing
1. Open Tender Hours (from the home screen icon, not the browser).
2. Tap the **bell icon** in the top-right of the header.
3. Click **Enable notifications**.
4. If you accidentally blocked them: click the 🔒 icon in the browser's address bar → Site settings → Notifications → Allow.

---

## Project structure

```
.
├── prisma/
│   └── schema.prisma              # Activity model with reminders + recurrence
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                       # Service worker (offline cache)
│   ├── icon-192.png, icon-512.png  # PWA icons
│   ├── maskable-192.png, maskable-512.png
│   ├── apple-touch-icon.png
│   └── favicon-*.png
├── scripts/
│   └── generate-icons.py          # Regenerate the PWA icons
├── src/
│   ├── app/
│   │   ├── layout.tsx              # PWA metadata, SW registration
│   │   ├── page.tsx                # Main UI (Now / Today / Schedule / Insights)
│   │   └── api/
│   │       ├── activities/route.ts          # GET, POST
│   │       ├── activities/[id]/route.ts     # GET, PATCH, DELETE
│   │       └── insights/route.ts           # Aggregated stats
│   ├── components/
│   │   ├── pwa-install-banner.tsx  # "Install Tender Hours" banner
│   │   └── service-worker-register.tsx  # SW registration
│   ├── hooks/
│   │   ├── use-reminders.ts        # Notification permission, polling, snooze, EOD
│   │   └── use-pwa-install.ts      # PWA install prompt handling
│   └── lib/
│       ├── healing.ts              # Constants, types, time/recurrence helpers
│       ├── recurrence.ts           # Server-side recurrence expansion
│       └── db.ts                   # Prisma client
├── .env                            # DATABASE_URL (not committed)
├── .gitignore
└── README.md
```

---

## License

Personal project — all rights reserved. Use it, fork it, share it, but please don't sell it as-is.

---


## Acknowledgments

Built with care for people doing the slow work of healing. Be tender with yourself.

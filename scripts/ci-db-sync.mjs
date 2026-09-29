#!/usr/bin/env node
// Deploy-time database sync.
//
// Runs `prisma db push` when DATABASE_URL is present, so new models/tables
// reach the database on every deploy (Vercel runs this during install/build).
// Skips quietly when no URL is set - e.g. preview environments without a
// database, or a local `npm install` without .env loaded.
//
// Safety: the push runs WITHOUT --accept-data-loss, so a change that would
// drop data or columns fails the sync (and the build) instead of applying
// silently. Additive changes (new tables/columns) apply automatically.

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const url = process.env.DATABASE_URL
if (!url) {
  console.log('[db-sync] DATABASE_URL not set - skipping database sync.')
  process.exit(0)
}

console.log('[db-sync] Syncing database schema (prisma db push)...')

const cliEntry = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js')
let result
if (existsSync(cliEntry)) {
  result = spawnSync(process.execPath, [cliEntry, 'db', 'push', '--skip-generate'], {
    stdio: 'inherit',
  })
} else {
  result = spawnSync('npx prisma db push --skip-generate', { stdio: 'inherit', shell: true })
}

if (result.status !== 0) {
  console.error('[db-sync] prisma db push failed with exit code', result.status)
  process.exit(result.status ?? 1)
}

console.log('[db-sync] Database schema is in sync.')

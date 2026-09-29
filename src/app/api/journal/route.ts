import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/journal?limit=50 — recent journal entries, newest first.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limitRaw = Number(searchParams.get('limit') ?? '50')
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, Math.floor(limitRaw)), 200) : 50

  const entries = await db.journalEntry.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return NextResponse.json({ entries })
}

// POST /api/journal — save a journal entry.
// Body: { text: string, skipScan?: boolean }
// When skipScan is true the entry is stored without an AI scan ("skipped");
// otherwise it starts as "pending" and the client kicks off /api/reframe.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const text = String(body.text ?? '').trim()

  if (text.length < 3) {
    return NextResponse.json({ error: 'Write a little more first.' }, { status: 400 })
  }
  if (text.length > 4000) {
    return NextResponse.json(
      { error: 'Entry too long (max 4000 characters).' },
      { status: 413 }
    )
  }

  const entry = await db.journalEntry.create({
    data: {
      text,
      reframeStatus: body.skipScan ? 'skipped' : 'pending',
    },
  })
  return NextResponse.json({ entry })
}

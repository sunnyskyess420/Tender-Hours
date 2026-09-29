import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/checkins — recent check-ins, newest first.
// Optional ?since=ISO timestamp to fetch only newer ones.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const since = searchParams.get('since')

  const checkIns = await db.checkIn.findMany({
    where: since ? { createdAt: { gte: new Date(since) } } : {},
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
  return NextResponse.json({ checkIns })
}

// POST /api/checkins — record a quick check-in.
// Body: { kind: 'mood' | 'healing' | 'move', value?: string, note?: string }
//   mood    — value: '1'..'5'
//   healing — value: 'yes' | 'no' | 'skip'
//   move    — value: none
export async function POST(req: NextRequest) {
  const body = await req.json()
  const kind = String(body.kind ?? '')

  if (!['mood', 'healing', 'move'].includes(kind)) {
    return NextResponse.json(
      { error: 'kind must be mood, healing or move' },
      { status: 400 }
    )
  }

  if (kind === 'mood') {
    const v = Number(body.value)
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      return NextResponse.json({ error: 'mood value must be 1-5' }, { status: 400 })
    }
  }
  if (kind === 'healing' && !['yes', 'no', 'skip'].includes(String(body.value))) {
    return NextResponse.json(
      { error: 'healing value must be yes, no or skip' },
      { status: 400 }
    )
  }

  const checkIn = await db.checkIn.create({
    data: {
      kind,
      value: body.value != null ? String(body.value) : null,
      note: body.note ? String(body.note).slice(0, 1000) : null,
    },
  })
  return NextResponse.json({ checkIn })
}

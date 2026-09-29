import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { MAX_CARDS } from '@/lib/cue-cards'

// GET /api/cue-cards — all saved cue cards, oldest first.
export async function GET() {
  const cueCards = await db.cueCard.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ cueCards })
}

// POST /api/cue-cards — add a cue card. Body: { text }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const text = String(body.text ?? '').trim()
  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }
  if (text.length > 200) {
    return NextResponse.json({ error: 'keep cue cards under 200 characters' }, { status: 400 })
  }
  const count = await db.cueCard.count()
  if (count >= MAX_CARDS) {
    return NextResponse.json({ error: `the deck is full (${MAX_CARDS} cards)` }, { status: 400 })
  }
  const cueCard = await db.cueCard.create({ data: { text } })
  return NextResponse.json({ cueCard })
}

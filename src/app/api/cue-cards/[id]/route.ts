import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/cue-cards/[id] — edit a cue card's text. Body: { text }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const text = String(body.text ?? '').trim()
  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }
  if (text.length > 200) {
    return NextResponse.json({ error: 'keep cue cards under 200 characters' }, { status: 400 })
  }
  const existing = await db.cueCard.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  const cueCard = await db.cueCard.update({ where: { id }, data: { text } })
  return NextResponse.json({ cueCard })
}

// DELETE /api/cue-cards/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const existing = await db.cueCard.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  await db.cueCard.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

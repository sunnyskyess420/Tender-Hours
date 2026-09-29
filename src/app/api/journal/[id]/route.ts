import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/journal/[id] — store the AI scan result (or clear it for a retry).
// Body: { reframeJson?, reframeStatus?, reframeError? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const existing = await db.journalEntry.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if ('reframeJson' in body) {
    data.reframeJson = body.reframeJson == null ? null : String(body.reframeJson)
  }
  if ('reframeStatus' in body) {
    const status = String(body.reframeStatus)
    if (!['pending', 'done', 'error', 'skipped'].includes(status)) {
      return NextResponse.json({ error: 'invalid reframeStatus' }, { status: 400 })
    }
    data.reframeStatus = status
  }
  if ('reframeError' in body) {
    data.reframeError = body.reframeError == null ? null : String(body.reframeError).slice(0, 1000)
  }

  const entry = await db.journalEntry.update({ where: { id }, data })
  return NextResponse.json({ entry })
}

// DELETE /api/journal/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const existing = await db.journalEntry.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  await db.journalEntry.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

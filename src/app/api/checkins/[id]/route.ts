import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/checkins/[id] — remove a check-in (e.g. a mis-tap).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const existing = await db.checkIn.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  await db.checkIn.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { RecurrenceRule, encodeRule, decodeRule } from '@/lib/healing'
import { expandTemplate, propagateTemplateEdits } from '@/lib/recurrence'

// GET /api/activities/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const activity = await db.activity.findUnique({ where: { id } })
  if (!activity) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  return NextResponse.json({ activity })
}

// PATCH /api/activities/[id] — partial update.
//
// If the activity being patched is a recurrence TEMPLATE, changes to title,
// notes, category, duration, reminderMin propagate to all future planned
// occurrences. Changes to recurrenceRule regenerate the schedule.
//
// If the activity is a single occurrence (not a template), edits apply only
// to that occurrence.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const existing = await db.activity.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const data: any = {}
  const allowed = [
    'title',
    'notes',
    'category',
    'date',
    'startTime',
    'endTime',
    'durationMin',
    'status',
    'healingImpact',
    'healingNote',
    'moodBefore',
    'moodAfter',
    'reminderMin',
    'reminderFired',
  ]
  for (const k of allowed) {
    if (k in body) data[k] = body[k]
  }

  // If the user reschedules the start time, reset reminderFired.
  if ('startTime' in body && body.startTime !== undefined) {
    data.reminderFired = false
  }

  // Handle recurrenceRule changes on a template.
  if ('recurrenceRule' in body) {
    const newRule: RecurrenceRule | null = body.recurrenceRule ?? null
    data.recurrenceRule = encodeRule(newRule)
    if (!newRule) {
      // Switching from recurring → one-time. Demote the template.
      data.isRecurrenceTemplate = false
      data.recurrenceExpandedThrough = null
      // Detach existing future occurrences (set their templateId to null so they
      // become standalone, but don't delete them — the user may want to keep
      // history).
      await db.activity.updateMany({
        where: { recurrenceTemplateId: id, status: 'planned' },
        data: { recurrenceTemplateId: null },
      })
    }
  }

  const activity = await db.activity.update({
    where: { id },
    data,
  })

  // If this was a template and recurrence-relevant fields changed, propagate.
  if (existing.isRecurrenceTemplate) {
    const propagated: any = {}
    if (data.title !== undefined) propagated.title = data.title
    if (data.notes !== undefined) propagated.notes = data.notes
    if (data.category !== undefined) propagated.category = data.category
    if (data.durationMin !== undefined) propagated.durationMin = data.durationMin
    if (data.reminderMin !== undefined) propagated.reminderMin = data.reminderMin
    if (Object.keys(propagated).length > 0) {
      try {
        await propagateTemplateEdits(id, propagated)
      } catch (e) {
        console.error('propagation failed', e)
      }
    }

    // If the rule itself changed, re-expand.
    if ('recurrenceRule' in body) {
      try {
        await expandTemplate(id, new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))
      } catch (e) {
        console.error('re-expansion failed', e)
      }
    }
  }

  return NextResponse.json({ activity })
}

// DELETE /api/activities/[id]
//
// If the activity is a recurrence template, `?cascade=future` deletes all
// future planned occurrences too. Without cascade, only the template is
// deleted and existing occurrences become standalone.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const cascade = searchParams.get('cascade') === 'future'

  const existing = await db.activity.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  if (existing.isRecurrenceTemplate && cascade) {
    await db.activity.deleteMany({
      where: {
        OR: [
          { id },
          { recurrenceTemplateId: id, status: 'planned' },
        ],
      },
    })
  } else {
    await db.activity.delete({ where: { id } })
  }

  return NextResponse.json({ ok: true })
}

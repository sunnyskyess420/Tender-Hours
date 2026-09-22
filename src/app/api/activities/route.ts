import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { RecurrenceRule, encodeRule, decodeRule } from '@/lib/healing'
import { expandAllTemplates, expandTemplate } from '@/lib/recurrence'

// GET /api/activities?date=YYYY-MM-DD       — list activities for a day
// GET /api/activities?from=YYYY-MM-DD&to=YYYY-MM-DD — list activities in a range
// GET /api/activities?status=active         — list active activities (live timers)
// GET /api/activities?remindersDue=1        — list planned activities whose
//                                             reminder time has come (within the
//                                             next minute) and not yet fired
// GET /api/activities (no query)             — list all activities, newest first
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const status = searchParams.get('status')
  const remindersDue = searchParams.get('remindersDue') === '1'

  // Before any query that lists planned activities, expand recurring templates
  // out 30 days. This keeps occurrences always visible in the schedule view.
  try {
    await expandAllTemplates()
  } catch (e) {
    console.error('recurrence expansion failed', e)
  }

  if (remindersDue) {
    const now = Date.now()
    const todayStr = new Date().toISOString().slice(0, 10)
    const futureStr = new Date(now + 3 * 86400000).toISOString().slice(0, 10)
    const upcoming = await db.activity.findMany({
      where: {
        status: 'planned',
        date: { gte: todayStr, lte: futureStr },
        reminderMin: { not: null },
        reminderFired: false,
        isRecurrenceTemplate: false,
      },
    })
    const due = upcoming.filter((a) => {
      const start = new Date(a.startTime).getTime()
      const reminderOffset = (a.reminderMin ?? 0) * 60000
      const dueAt = start - reminderOffset
      return now >= dueAt - 30000
    })
    return NextResponse.json({ activities: due })
  }

  let where: any = { isRecurrenceTemplate: false }
  if (date) where.date = date
  if (status) where.status = status
  if (from && to) where.date = { gte: from, lte: to }

  const activities = await db.activity.findMany({
    where,
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })
  return NextResponse.json({ activities })
}

// POST /api/activities — create a new activity.
// If recurrenceRule is provided (non-null), this creates a recurrence TEMPLATE
// (not a one-time activity). Otherwise, it creates a normal one-time activity.
//
// Body: {
//   title, notes?, category, date, startTime, endTime?, durationMin?, status,
//   healingImpact?, healingNote?, moodBefore?, moodAfter?, reminderMin?,
//   recurrenceRule?: RecurrenceRule | null
// }
export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.title || !body.date || !body.startTime) {
    return NextResponse.json(
      { error: 'title, date and startTime are required' },
      { status: 400 }
    )
  }

  const recurrenceRule: RecurrenceRule | null = body.recurrenceRule ?? null
  const isTemplate = !!recurrenceRule

  const activity = await db.activity.create({
    data: {
      title: String(body.title),
      notes: body.notes ?? null,
      category: body.category ?? 'other',
      date: String(body.date),
      startTime: String(body.startTime),
      endTime: body.endTime ?? null,
      durationMin: body.durationMin ?? null,
      status: body.status ?? 'planned',
      healingImpact: body.healingImpact ?? null,
      healingNote: body.healingNote ?? null,
      moodBefore: body.moodBefore ?? null,
      moodAfter: body.moodAfter ?? null,
      reminderMin: body.reminderMin ?? null,
      reminderFired: false,
      isRecurrenceTemplate: isTemplate,
      recurrenceTemplateId: null,
      recurrenceRule: encodeRule(recurrenceRule),
      recurrenceExpandedThrough: null,
    },
  })

  // If it's a template, immediately expand occurrences for the next 30 days.
  if (isTemplate) {
    try {
      await expandTemplate(activity.id, new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))
    } catch (e) {
      console.error('initial recurrence expansion failed', e)
    }
  }

  return NextResponse.json({ activity })
}

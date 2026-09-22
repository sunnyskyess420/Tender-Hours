// Server-side recurrence expansion utilities.
import { db } from '@/lib/db'
import {
  RecurrenceRule,
  decodeRule,
  expandRecurrence,
  isoFromLocal,
  todayISODate,
  addDays,
} from '@/lib/healing'

/**
 * Find all recurrence templates and ensure each has occurrences generated
 * through `throughDate` (default: 30 days from today). Idempotent — only
 * generates occurrences for dates that don't already exist.
 */
export async function expandAllTemplates(throughDate?: string) {
  const today = todayISODate()
  const through = throughDate ?? addDays(today, 30)

  const templates = await db.activity.findMany({
    where: { isRecurrenceTemplate: true },
  })

  for (const tpl of templates) {
    await expandTemplate(tpl.id, through)
  }
}

/**
 * Expand a single template up to (and including) `throughDate`.
 *
 * Strategy:
 *  1. Parse the rule.
 *  2. Determine the range to generate: from max(templateExpandedThrough+1,
 *     today) through `throughDate`.
 *  3. Compute the list of occurrence dates with expandRecurrence().
 *  4. For each date, check if an occurrence already exists (skip if so), else
 *     create one as a planned activity with startTime at the same local time
 *     of day as the template, same duration, same reminder, etc.
 *  5. Update `recurrenceExpandedThrough` on the template.
 */
export async function expandTemplate(templateId: string, throughDate: string) {
  const tpl = await db.activity.findUnique({ where: { id: templateId } })
  if (!tpl || !tpl.isRecurrenceTemplate) return

  const rule = decodeRule(tpl.recurrenceRule)
  if (!rule) return

  // Start date of recurrence = the template's own date.
  const startDate = tpl.date
  // Where to start generating. Always use today as the lower bound so we
  // don't backfill old occurrences (those should be created on demand only).
  const today = todayISODate()
  const fromDate =
    tpl.recurrenceExpandedThrough && tpl.recurrenceExpandedThrough > today
      ? addDays(tpl.recurrenceExpandedThrough, 1)
      : today

  if (fromDate > throughDate) {
    // Already expanded beyond throughDate.
    await db.activity.update({
      where: { id: templateId },
      data: { recurrenceExpandedThrough: throughDate },
    })
    return
  }

  const dates = expandRecurrence(rule, startDate, fromDate, throughDate)

  // Extract the local time of day from the template's startTime.
  const tplStart = new Date(tpl.startTime)
  const hours = tplStart.getHours()
  const minutes = tplStart.getMinutes()

  // Fetch existing occurrences for these dates so we don't duplicate.
  const existing = await db.activity.findMany({
    where: {
      recurrenceTemplateId: templateId,
      date: { in: dates },
    },
    select: { date: true },
  })
  const existingDates = new Set(existing.map((e) => e.date))

  const toCreate: Array<{
    title: string
    notes: string | null
    category: string
    date: string
    startTime: string
    endTime: string | null
    durationMin: number | null
    status: string
    reminderMin: number | null
    isRecurrenceTemplate: boolean
    recurrenceTemplateId: string
  }> = []

  for (const date of dates) {
    if (existingDates.has(date)) continue
    // Build startTime ISO for this date at the same local time of day.
    const [y, m, d] = date.split('-').map(Number)
    const start = new Date(y, m - 1, d, hours, minutes, 0, 0)
    toCreate.push({
      title: tpl.title,
      notes: tpl.notes,
      category: tpl.category,
      date,
      startTime: start.toISOString(),
      endTime: null,
      durationMin: tpl.durationMin,
      status: 'planned',
      reminderMin: tpl.reminderMin,
      isRecurrenceTemplate: false,
      recurrenceTemplateId: templateId,
    })
  }

  if (toCreate.length > 0) {
    await db.activity.createMany({ data: toCreate })
  }

  await db.activity.update({
    where: { id: templateId },
    data: { recurrenceExpandedThrough: throughDate },
  })
}

/**
 * When a template is edited, propagate the changes to future occurrences
 * (those with date >= today and not yet completed/skipped).
 *
 * `fields` is a partial activity object containing the editable fields.
 */
export async function propagateTemplateEdits(
  templateId: string,
  fields: {
    title?: string
    notes?: string | null
    category?: string
    durationMin?: number | null
    reminderMin?: number | null
  }
) {
  const today = todayISODate()
  await db.activity.updateMany({
    where: {
      recurrenceTemplateId: templateId,
      date: { gte: today },
      status: 'planned',
    },
    data: {
      ...(fields.title !== undefined ? { title: fields.title } : {}),
      ...(fields.notes !== undefined ? { notes: fields.notes } : {}),
      ...(fields.category !== undefined ? { category: fields.category } : {}),
      ...(fields.durationMin !== undefined ? { durationMin: fields.durationMin } : {}),
      ...(fields.reminderMin !== undefined ? { reminderMin: fields.reminderMin } : {}),
    },
  })
}

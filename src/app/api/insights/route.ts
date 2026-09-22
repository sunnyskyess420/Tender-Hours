import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/insights?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns aggregated stats for the dashboard:
//   - total minutes spent, broken down by category
//   - healing score distribution (helped / neutral / hindered / unsure counts)
//   - minutes spent on activities marked "helped" (the "moving toward healing" total)
//   - daily totals across the range (for trend chart)
//   - mood delta averages (moodAfter - moodBefore)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let where: any = {}
  if (from && to) where.date = { gte: from, lte: to }

  const activities = await db.activity.findMany({
    where,
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })

  // Minutes by category
  const minutesByCategory: Record<string, number> = {}
  // Healing impact counts
  const healingCounts = { helped: 0, neutral: 0, hindered: 0, unsure: 0 }
  // Total minutes that "moved toward healing"
  let healingMinutes = 0
  // Daily totals: { date: { minutes, healingMinutes } }
  const byDate: Record<string, { minutes: number; healingMinutes: number }> = {}
  // Mood delta tracking
  let moodDeltaSum = 0
  let moodDeltaCount = 0

  for (const a of activities) {
    const minutes = a.durationMin ?? 0
    if (minutes > 0) {
      minutesByCategory[a.category] = (minutesByCategory[a.category] ?? 0) + minutes
      if (!byDate[a.date]) byDate[a.date] = { minutes: 0, healingMinutes: 0 }
      byDate[a.date].minutes += minutes
    }
    if (a.healingImpact && a.healingImpact in healingCounts) {
      ;(healingCounts as any)[a.healingImpact] += 1
      if (a.healingImpact === 'helped' && minutes > 0) {
        healingMinutes += minutes
        if (byDate[a.date]) byDate[a.date].healingMinutes += minutes
      }
    }
    if (a.moodBefore != null && a.moodAfter != null) {
      moodDeltaSum += a.moodAfter - a.moodBefore
      moodDeltaCount += 1
    }
  }

  const dailyTrend = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }))

  return NextResponse.json({
    totalActivities: activities.length,
    totalMinutes: Object.values(minutesByCategory).reduce((a, b) => a + b, 0),
    healingMinutes,
    minutesByCategory,
    healingCounts,
    dailyTrend,
    avgMoodDelta: moodDeltaCount ? moodDeltaSum / moodDeltaCount : 0,
  })
}

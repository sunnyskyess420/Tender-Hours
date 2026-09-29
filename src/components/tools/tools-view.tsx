'use client'

// Tools tab — the merged-in toolkit: check-ins, grounding, a DBT skill for
// the moment, and cue cards. Everything here is reachable in one tap from any
// tab via the tab bar.

import { useEffect, useState } from 'react'
import { Wind } from 'lucide-react'
import { api } from '@/lib/api'
import { Activity, todayISODate } from '@/lib/healing'
import { SkillContext } from '@/lib/dbt-skills'
import {
  BoxBreathingSheet,
  ColdWaterSheet,
  GroundingToolList,
  SensesFlowSheet,
  TippSheet,
} from './grounding'
import { CheckInSection } from './checkin'
import { JournalSection } from './journal'
import { CueCardsSection } from './cue-cards'
import { DbtSkillCard } from './dbt-card'

export function ToolsView() {
  const today = todayISODate()
  const [ctx, setCtx] = useState<SkillContext>({ hour: new Date().getHours() })

  // Grounding sheets
  const [sensesOpen, setSensesOpen] = useState(false)
  const [breathingOpen, setBreathingOpen] = useState(false)
  const [tippOpen, setTippOpen] = useState(false)
  const [coldOpen, setColdOpen] = useState(false)

  // Keep the "right now" context fresh for the DBT card.
  useEffect(() => {
    let stop = false
    async function load() {
      try {
        const data = await api<{ activities: Activity[] }>(`/api/activities?date=${today}`)
        if (stop) return
        const list = data.activities
        const active = list.find((a) => a.status === 'active')
        const now = Date.now()
        const current = list.find((a) => {
          if (a.status !== 'planned' && a.status !== 'active') return false
          const start = new Date(a.startTime).getTime()
          const end = start + (a.durationMin ?? 60) * 60000
          return now >= start && now < end
        })
        const pick = active ?? current
        setCtx({
          title: pick?.title ?? null,
          category: pick?.category ?? null,
          hour: new Date().getHours(),
        })
      } catch (e) {
        console.error('could not load activity context', e)
      }
    }
    void load()
    const id = setInterval(load, 60000)
    return () => {
      stop = true
      clearInterval(id)
    }
  }, [today])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-stone-800">Your toolkit</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          For the moments in between — check in, ground, steady yourself.
        </p>
      </div>

      <CheckInSection />

      <JournalSection />

      <section>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
          <Wind className="w-4 h-4" />
          Grounding tools
        </h3>
        <p className="text-xs text-stone-500 mb-3">
          One tap. Under 60 seconds. No streaks, no shame.
        </p>
        <GroundingToolList
          onOpenSenses={() => setSensesOpen(true)}
          onOpenBreathing={() => setBreathingOpen(true)}
          onOpenTipp={() => setTippOpen(true)}
          onOpenColdWater={() => setColdOpen(true)}
        />
      </section>

      <DbtSkillCard context={ctx} />

      <CueCardsSection />

      {/* Grounding sheets */}
      <SensesFlowSheet open={sensesOpen} onOpenChange={setSensesOpen} />
      <BoxBreathingSheet open={breathingOpen} onOpenChange={setBreathingOpen} />
      <TippSheet open={tippOpen} onOpenChange={setTippOpen} />
      <ColdWaterSheet open={coldOpen} onOpenChange={setColdOpen} />
    </div>
  )
}

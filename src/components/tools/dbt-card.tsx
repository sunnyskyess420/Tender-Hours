'use client'

// DBT skill card for the Tools tab — picks a fitting skill from what you are
// doing right now (or the time of day) and shows the full library on request.

import { useState } from 'react'
import { Compass } from 'lucide-react'
import { DBT_SKILLS, SkillContext, skillForNow } from '@/lib/dbt-skills'

export function DbtSkillCard({ context }: { context: SkillContext }) {
  const [showAll, setShowAll] = useState(false)
  const skill = skillForNow(context)

  return (
    <div className="rounded-3xl bg-white border border-stone-200/60 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
          <Compass className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-stone-800">Right now — a DBT skill</h2>
          <p className="text-xs text-stone-500">
            {context.title ? (
              <>
                For &ldquo;{context.title}&rdquo;
              </>
            ) : (
              'Based on the time of day'
            )}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-700">
          {skill.category}
        </span>
      </div>

      <p className="text-base font-semibold text-stone-800">
        {skill.acronym ? `${skill.acronym} · ` : ''}
        {skill.name}
      </p>
      <p className="mt-1 text-sm text-stone-600">{skill.oneLine}</p>
      {skill.steps && (
        <p className="mt-1.5 text-xs text-stone-500">
          <span className="font-medium text-stone-700">Steps:</span> {skill.steps.join(' → ')}
        </p>
      )}
      <p className="mt-1.5 text-xs italic text-stone-400">{skill.whenToUse}</p>

      <button
        onClick={() => setShowAll((v) => !v)}
        className="mt-4 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
      >
        {showAll ? 'Hide the full list' : `See all ${DBT_SKILLS.length} skills`}
      </button>

      {showAll && (
        <ul className="mt-3 space-y-2.5 border-t border-stone-100 pt-3">
          {DBT_SKILLS.map((s) => (
            <li key={s.id} className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-stone-700">
                {s.acronym ? `${s.acronym} · ` : ''}
                {s.name}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-stone-400 shrink-0">
                {s.category}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

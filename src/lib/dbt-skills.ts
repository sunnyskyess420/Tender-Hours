// DBT skills rotation — picks a skill based on what you're doing right now and
// falls back to time-of-day. Ported from Healing Companion; the schedule-block
// matching now reads Tender Hours activities (title + category) instead.
//
// The point is to keep DBT skills present in the day, not to be a
// comprehensive DBT curriculum.

export interface DbtSkill {
  id: string
  acronym?: string // e.g. "STOP", "TIPP"
  name: string // full name
  category: 'Mindfulness' | 'Distress Tolerance' | 'Emotion Regulation' | 'Interpersonal Effectiveness'
  oneLine: string // short reminder
  steps?: string[] // what each letter stands for (optional)
  whenToUse: string // when this skill is most useful
}

export const DBT_SKILLS: DbtSkill[] = [
  // Mindfulness
  {
    id: 'wise_mind',
    name: 'Wise Mind',
    category: 'Mindfulness',
    oneLine: 'The integration of emotion mind and reasonable mind. Find it in your body, behind your sternum.',
    whenToUse: "When you're caught between pure logic and pure emotion and need integration.",
  },
  {
    id: 'observe_describe',
    acronym: 'ODP',
    name: 'Observe, Describe, Participate',
    category: 'Mindfulness',
    oneLine: 'Notice the experience, put words on it, then enter it fully without self-consciousness.',
    steps: ['Observe', 'Describe', 'Participate'],
    whenToUse: "When you're checked out or flooded. Start with observe.",
  },

  // Distress Tolerance
  {
    id: 'stop',
    acronym: 'STOP',
    name: 'STOP',
    category: 'Distress Tolerance',
    oneLine: "Don't react yet. Step back, observe, decide how to proceed.",
    steps: ['Stop', 'Take a breath', 'Observe', 'Proceed mindfully'],
    whenToUse: 'When an urge to act on emotion is high. The 90-second pause that changes outcomes.',
  },
  {
    id: 'tipp',
    acronym: 'TIPP',
    name: 'TIPP',
    category: 'Distress Tolerance',
    oneLine: 'Body-first reset: Temperature, Intense exercise, Paced breathing, Paired muscle relaxation.',
    steps: ['Temperature', 'Intense exercise', 'Paced breathing', 'Paired muscle relaxation'],
    whenToUse: 'When emotion is too high to think. Use any one.',
  },
  {
    id: 'radical_acceptance',
    name: 'Radical Acceptance',
    category: 'Distress Tolerance',
    oneLine: 'Accept reality as it is, not as you wish it were. Acceptance is not approval.',
    whenToUse: "When you're fighting reality and losing.",
  },
  {
    id: 'coping_ahead',
    name: 'Coping Ahead',
    category: 'Distress Tolerance',
    oneLine: "Rehearse a difficult situation in advance, plus the skill you'll use when it comes.",
    whenToUse: 'Before therapy, before a hard conversation, before bed if tomorrow is hard.',
  },
  {
    id: 'improve',
    acronym: 'IMPROVE',
    name: 'IMPROVE the Moment',
    category: 'Distress Tolerance',
    oneLine: 'Imagery, Meaning, Prayer, Relaxation, One thing at a time, Vacation, Encouragement.',
    steps: ['Imagery', 'Meaning', 'Prayer', 'Relaxation', 'One thing', 'Vacation', 'Encouragement'],
    whenToUse: "When you can't change the situation and need to make the moment bearable.",
  },

  // Emotion Regulation
  {
    id: 'opposite_action',
    name: 'Opposite Action',
    category: 'Emotion Regulation',
    oneLine: 'Do the opposite of what the emotion says. Sad says hide → reach out.',
    whenToUse: 'When an emotion is justified but unhelpful, or unjustified.',
  },
  {
    id: 'please',
    acronym: 'PLEASE',
    name: 'PLEASE',
    category: 'Emotion Regulation',
    oneLine: 'Treat Physical illness, Balanced eating, Avoid mood-altering drugs, Balanced sleep, Get Exercise.',
    steps: ['PhysicaL illness', 'Balanced Eating', 'Avoid mood-altering drugs', 'Balanced Sleep', 'Get Exercise'],
    whenToUse: 'Meals, sleep, basic body care. Treat it as the foundation everything else rests on.',
  },
  {
    id: 'build_mastery',
    name: 'Build Mastery',
    category: 'Emotion Regulation',
    oneLine: 'Do at least one small thing each day that gives a sense of competence.',
    whenToUse: 'Small wins compound — a session of any kind of making is perfect for this.',
  },

  // Interpersonal Effectiveness
  {
    id: 'dear_man',
    acronym: 'DEAR MAN',
    name: 'DEAR MAN',
    category: 'Interpersonal Effectiveness',
    oneLine: 'Describe, Express, Assert, Reinforce — stay Mindful, Appear confident, Negotiate.',
    steps: ['Describe', 'Express', 'Assert', 'Reinforce', 'stay Mindful', 'Appear confident', 'Negotiate'],
    whenToUse: 'Asking for what you want or saying no. Therapy prep, difficult conversations.',
  },
  {
    id: 'give',
    acronym: 'GIVE',
    name: 'GIVE',
    category: 'Interpersonal Effectiveness',
    oneLine: 'Be Gentle, Interested, Validate, Easy manner — keep the relationship.',
    steps: ['Gentle', 'Interested', 'Validate', 'Easy manner'],
    whenToUse: 'When you want the other person to keep listening.',
  },
  {
    id: 'fast',
    acronym: 'FAST',
    name: 'FAST',
    category: 'Interpersonal Effectiveness',
    oneLine: 'Be Fair, no Apologies, Stick to your values, be Truthful — keep your self-respect.',
    steps: ['Fair', 'no Apologies', 'Stick to values', 'Truthful'],
    whenToUse: 'After GIVE works, or when you need to protect your self-respect.',
  },
]

// Keywords in what you're doing right now → a DBT skill that fits.
// Editable — these are starting points, tune them to your own day.
const ACTIVITY_SKILL_MAP: Array<{ match: RegExp; skillId: string }> = [
  { match: /wake|coffee|slow/i, skillId: 'wise_mind' },
  { match: /coding|work|session|admin|chores/i, skillId: 'stop' },
  { match: /watch|stream|show|movie/i, skillId: 'radical_acceptance' },
  { match: /dinner|snack|eat|meal|lunch|breakfast/i, skillId: 'please' },
  { match: /wind.?down|journal|write/i, skillId: 'coping_ahead' },
  { match: /bed|sleep|nap/i, skillId: 'please' },
  { match: /therapy|group|dbt|appointment/i, skillId: 'dear_man' },
  { match: /grounding|breath|decompress|meditat/i, skillId: 'tipp' },
  { match: /rest|quiet|no.?agenda|break/i, skillId: 'improve' },
  { match: /call|friend|family|talk|visit/i, skillId: 'give' },
]

// Category-level fallback: Tender Hours categories → a fitting skill.
const CATEGORY_SKILL_MAP: Record<string, string> = {
  work: 'stop',
  therapy: 'dear_man',
  nutrition: 'please',
  rest: 'improve',
  creativity: 'build_mastery',
  learning: 'build_mastery',
  connection: 'give',
  mindfulness: 'wise_mind',
}

// Time-of-day fallback when nothing else matches.
const HOUR_FALLBACK: Record<number, string> = {
  6: 'wise_mind',
  7: 'wise_mind',
  8: 'wise_mind',
  9: 'stop',
  10: 'stop',
  11: 'stop',
  12: 'please',
  13: 'stop',
  14: 'stop',
  15: 'stop',
  16: 'stop',
  17: 'radical_acceptance',
  18: 'please',
  19: 'please',
  20: 'build_mastery',
  21: 'build_mastery',
  22: 'coping_ahead',
  23: 'coping_ahead',
  0: 'please',
  1: 'observe_describe',
  2: 'observe_describe',
  3: 'observe_describe',
  4: 'observe_describe',
  5: 'observe_describe',
}

export interface SkillContext {
  /** What you're doing right now (active or current activity title), if any. */
  title?: string | null
  /** Its Tender Hours category, if any. */
  category?: string | null
  /** Current hour (0-23), local time. */
  hour: number
}

function byId(id: string): DbtSkill | undefined {
  return DBT_SKILLS.find((s) => s.id === id)
}

// Pick the DBT skill for the current moment.
export function skillForNow(ctx: SkillContext): DbtSkill {
  // 1. What you're doing right now (title keywords).
  if (ctx.title) {
    const match = ACTIVITY_SKILL_MAP.find((m) => m.match.test(ctx.title!))
    if (match) {
      const skill = byId(match.skillId)
      if (skill) return skill
    }
  }

  // 2. Its category.
  if (ctx.category && CATEGORY_SKILL_MAP[ctx.category]) {
    const skill = byId(CATEGORY_SKILL_MAP[ctx.category])
    if (skill) return skill
  }

  // 3. Time of day.
  const fallbackId = HOUR_FALLBACK[ctx.hour] ?? 'wise_mind'
  return byId(fallbackId) ?? DBT_SKILLS[0]
}

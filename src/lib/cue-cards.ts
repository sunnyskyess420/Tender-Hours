// Cue cards — short present-moment reminders, ported from Healing Companion.
// The starter deck is client-side content; saved cards live in the database.

export interface CueCard {
  id: string
  text: string
  createdAt: string
  updatedAt: string
}

/** Keep the deck small so it stays meaningful. */
export const MAX_CARDS = 24

/** Ready-made starters for people who find it hard to write their own.
 *  A starting point, not assignments — edit freely after adding. */
export const STARTER_CARDS: { id: string; text: string }[] = [
  { id: 'starter-01', text: 'I am here, in this room, in this body, right now.' },
  { id: 'starter-02', text: 'This feeling will pass. It always has.' },
  { id: 'starter-03', text: 'I can ride this wave without acting on it.' },
  { id: 'starter-04', text: "I don't have to fix this feeling. I only have to let it move through me." },
  { id: 'starter-05', text: 'A mistake is a moment, not a verdict about who I am.' },
  { id: 'starter-06', text: "I'm allowed to take up space, even on days I feel small." },
  { id: 'starter-07', text: "I can be kind to myself and still be honest about what's hard." },
  { id: 'starter-08', text: "My body is trying to keep me safe. It isn't the enemy." },
  { id: 'starter-09', text: "I don't owe anyone an explanation for taking care of myself." },
  { id: 'starter-10', text: "Slower isn't failing. Slower is how I last." },
  { id: 'starter-11', text: 'Urges rise and fall. I can let this one pass without following it.' },
  { id: 'starter-12', text: "I can say no without it meaning I don't care." },
  { id: 'starter-13', text: "Being unsure doesn't mean I'm unsafe." },
  { id: 'starter-14', text: "I'm allowed to rest before I earn it." },
  { id: 'starter-15', text: "The voice that says I'm too much isn't telling the truth." },
  { id: 'starter-16', text: "I don't have to feel okay to be worth staying for." },
  { id: 'starter-17', text: "One small next step is enough. I don't need the whole staircase." },
  { id: 'starter-18', text: 'I can feel afraid and still do the next right thing for me.' },
  { id: 'starter-19', text: "What happened wasn't my fault, and I don't have to carry it alone." },
  { id: 'starter-20', text: 'Asking for help is a skill, not a weakness.' },
]

'use client'

// A short in-app chime for the hourly move nudge.
//
// The web Notification API cannot choose a sound — its only audio control is
// `silent: true|false` and the operating system picks the rest. So a custom
// sound is only reachable from inside the page: this plays when a nudge fires
// while the app is open. Replace public/chime.wav with any sound you prefer.

const CHIME_KEY = 'tender-hours:chime'

export function isChimeEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(CHIME_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setChimePreference(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CHIME_KEY, enabled ? 'on' : 'off')
  } catch {
    // Private mode — the preference just will not persist.
  }
}

export function playChime(): void {
  if (typeof window === 'undefined') return
  if (!isChimeEnabled()) return
  try {
    const audio = new Audio('/chime.wav')
    audio.volume = 0.7
    // Autoplay policy allows sound once the user has interacted with the page.
    void audio.play().catch(() => {})
  } catch {
    // ignore
  }
}

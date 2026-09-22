'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'

/**
 * A three-way theme toggle: light / dark / system.
 * Cycles: light → dark → system → light.
 *
 * Uses suppressHydrationWarning on the icon container because the theme is
 * only known after mount (server renders default; client picks up localStorage
 * / OS preference). The container's class is theme-independent so it doesn't
 * mismatch.
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  function cycle() {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  return (
    <button
      onClick={cycle}
      suppressHydrationWarning
      className="relative w-10 h-10 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm flex items-center justify-center hover:bg-stone-50 dark:hover:bg-stone-700 transition"
      aria-label={`Switch theme (currently ${theme ?? 'system'})`}
      title={
        theme === 'system'
          ? 'System theme (click for light)'
          : theme === 'dark'
          ? 'Dark theme (click for system)'
          : 'Light theme (click for dark)'
      }
    >
      <span suppressHydrationWarning>
        {theme === 'system' ? (
          <Monitor className="w-5 h-5 text-stone-500 dark:text-stone-400" />
        ) : resolvedTheme === 'dark' ? (
          <Moon className="w-5 h-5 text-indigo-400" />
        ) : (
          <Sun className="w-5 h-5 text-amber-500" />
        )}
      </span>
    </button>
  )
}

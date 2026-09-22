'use client'

import { useEffect, useState } from 'react'

// Minimal type for the BeforeInstallPromptEvent (Chrome/Brave/Edge only).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const LS_DISMISSED_KEY = 'tender:pwaInstallDismissedAt'

/**
 * Hook that surfaces the PWA install prompt when the browser fires
 * `beforeinstallprompt`. Returns:
 *  - canInstall: true when the browser is ready to show the native prompt
 *  - promptInstall(): triggers the native prompt + tracks the user's choice
 *  - dismissed: true when the user has dismissed the banner recently
 *  - dismiss(): hide the banner for 7 days
 *  - installed: true when the app is already running as a PWA (in that case,
 *    we don't show the banner at all)
 */
export function usePWAInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [dismissedAt, setDismissedAt] = useState<number | null>(null)
  const [iosStandalone, setIosStandalone] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if already installed/standalone
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari doesn't fire beforeinstallprompt; check navigator.standalone
      (typeof navigator !== 'undefined' && (navigator as any).standalone === true)
    setInstalled(standalone)

    // iOS: detect "Add to Home Screen" mode
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (ios && !standalone) {
      setIosStandalone(true)
    }

    // Load dismissed timestamp
    try {
      const v = localStorage.getItem(LS_DISMISSED_KEY)
      if (v) setDismissedAt(Number(v))
    } catch {
      // ignore
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall as EventListener)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall as EventListener)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = () => {
    const now = Date.now()
    setDismissedAt(now)
    try {
      localStorage.setItem(LS_DISMISSED_KEY, String(now))
    } catch {
      // ignore
    }
  }

  const promptInstall = async () => {
    if (!deferred) return
    await deferred.prompt()
    const choice = await deferred.userChoice
    if (choice.outcome === 'dismissed') {
      dismiss()
    }
    setDeferred(null)
  }

  // Hide the banner if dismissed within the last 7 days
  const dismissedRecently =
    dismissedAt !== null && Date.now() - dismissedAt < 7 * 86400000

  return {
    canInstall: !!deferred && !installed && !dismissedRecently,
    promptInstall,
    dismiss,
    installed,
    iosStandalone: iosStandalone && !installed,
  }
}

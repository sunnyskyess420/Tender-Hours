'use client'

import { useEffect } from 'react'

/**
 * Registers the Tender Hours service worker on the client.
 * Mounted once at the app root so the SW is active across all pages.
 *
 * The SW handles offline caching and is required for the PWA install
 * prompt to appear in Chromium browsers (Brave, Chrome, Edge).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.info('Tender Hours service worker registered', reg.scope)
        })
        .catch((err) => {
          console.warn('Service worker registration failed', err)
        })
    }

    // Register after load so it doesn't compete with first-paint resources
    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
      return () => window.removeEventListener('load', register)
    }
  }, [])
  return null
}

'use client'

import { useEffect, useState } from 'react'
import { usePWAInstall } from '@/hooks/use-pwa-install'
import { Download, X, Share, Plus, Sparkles } from 'lucide-react'

/**
 * Shows an install banner at the top of the page when the PWA can be installed.
 *
 * - On Chromium browsers (Brave, Chrome, Edge): the browser fires
 *   `beforeinstallprompt` and we can trigger the native install dialog with
 *   a single button click.
 * - On iOS Safari: there's no programmatic install prompt, so we show
 *   step-by-step instructions (tap Share → Add to Home Screen).
 * - Once installed (or running as standalone), the banner disappears.
 */
export function PWAInstallBanner() {
  const { canInstall, promptInstall, dismiss, installed, iosStandalone } =
    usePWAInstall()
  const [showIosHelp, setShowIosHelp] = useState(false)

  if (installed) return null

  // iOS: no programmatic prompt, show instructions when banner is shown
  if (iosStandalone && !canInstall) {
    return <IosInstallCard onDismiss={dismiss} />
  }

  if (!canInstall && !iosStandalone) return null

  return (
    <div className="mx-4 sm:mx-6 mt-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Install Tender Hours</p>
          <p className="text-xs text-emerald-50 mt-0.5">
            Add to your home screen for reminders that work even when this tab is closed.
          </p>
        </div>
        <button
          onClick={promptInstall}
          className="px-3 py-2 rounded-lg bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-semibold shrink-0"
        >
          Install
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-white/70 hover:text-white shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function IosInstallCard({ onDismiss }: { onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="mx-4 sm:mx-6 mt-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Install Tender Hours on your iPhone</p>
            <p className="text-xs text-indigo-50 mt-0.5">
              Get reminders that fire even when Safari is closed.
            </p>
          </div>
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className="text-white/70 hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 w-full px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-medium"
        >
          {expanded ? 'Hide steps' : 'Show me how'}
        </button>
        {expanded && (
          <ol className="mt-3 space-y-2 text-xs text-indigo-50">
            <li className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">1</span>
              <span>
                Tap the <Share className="w-3 h-3 inline" /> <strong>Share</strong> button at the bottom of Safari.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">2</span>
              <span>
                Scroll down and tap <strong>Add to Home Screen</strong>{' '}
                (<Plus className="w-3 h-3 inline" /> icon).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">3</span>
              <span>Tap <strong>Add</strong>. Tender Hours will appear on your home screen with its own icon.</span>
            </li>
            <li className="text-indigo-100 pt-1">
              After that, opening the home screen icon will run as a real app and
              notifications will work even when Safari isn’t open.
            </li>
          </ol>
        )}
      </div>
    </div>
  )
}

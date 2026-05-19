'use client'

import { AlertTriangle } from 'lucide-react'
import { researchDisclaimer } from '@/lib/research-context'

export function ResearchDisclaimerBanner() {
  return (
    <div className="sticky top-0 z-20 flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-100">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="text-sm font-medium leading-6">{researchDisclaimer}</p>
    </div>
  )
}

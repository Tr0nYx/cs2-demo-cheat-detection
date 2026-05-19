import type { ReactNode } from 'react'
import { ConsolePanel, ResearchSignalNotice } from '@/components/Console'

interface IngestionActionsPanelProps {
  upload: ReactNode
  sharecode?: ReactNode
  tracking: ReactNode
}

export function IngestionActionsPanel({
  upload,
  sharecode,
  tracking,
}: IngestionActionsPanelProps) {
  return (
    <ConsolePanel
      title="Ingestion and provenance"
      description="Add demos manually, import sharecodes, or connect match-history tracking for authorized post-game discovery."
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {upload}
          {sharecode}
        </div>
        <div className="space-y-4">
          {tracking}
          <ResearchSignalNotice className="text-xs leading-5">
            Uploads, sharecodes, and match-history data describe import provenance only. They do not change suspicion,
            TRACE, labels, model confidence, or player trust.
          </ResearchSignalNotice>
        </div>
      </div>
    </ConsolePanel>
  )
}

import { Info } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type ResearchSignalNoticeProps = {
  children?: ReactNode
  className?: string
}

export function ResearchSignalNotice({
  children,
  className,
}: ResearchSignalNoticeProps) {
  return (
    <div
      role="note"
      className={cn(
        "flex gap-3 rounded-lg border border-trace-primary/30 bg-provenance-bg px-4 py-3 text-sm leading-6 text-foreground",
        className
      )}
    >
      <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-trace-primary" />
      <p>
        {children ??
          "Suspicion, TRACE, leaderboard, Steam, and match-history values are research signals for human review, not proof of cheating or an enforcement decision."}
      </p>
    </div>
  )
}

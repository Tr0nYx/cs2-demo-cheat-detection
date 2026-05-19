import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type ConsoleMetricProps = {
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: "neutral" | "clean" | "review" | "high" | "trace"
  className?: string
}

const toneClasses = {
  neutral: "border-border-subtle bg-surface-raised text-foreground",
  clean: "border-signal-clean/30 bg-signal-clean-bg text-signal-clean",
  review: "border-signal-review/35 bg-signal-review-bg text-signal-review",
  high: "border-signal-high/35 bg-signal-high-bg text-signal-high",
  trace: "border-trace-primary/35 bg-provenance-bg text-trace-primary",
}

export function ConsoleMetric({
  label,
  value,
  detail,
  tone = "neutral",
  className,
}: ConsoleMetricProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        toneClasses[tone],
        className
      )}
    >
      <div className="text-xs font-medium uppercase tracking-normal opacity-80">
        {label}
      </div>
      <div className="mt-2 font-data text-2xl font-semibold leading-none">
        {value}
      </div>
      {detail && <div className="mt-2 text-xs opacity-80">{detail}</div>}
    </div>
  )
}

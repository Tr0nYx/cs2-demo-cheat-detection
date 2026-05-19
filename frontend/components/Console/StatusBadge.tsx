import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Circle,
  Clock,
  Database,
  Radio,
  Shield,
  Upload,
  XCircle,
} from "lucide-react"
import type { ComponentType } from "react"

import { cn } from "@/lib/utils"

export type StatusBadgeVariant =
  | "neutral"
  | "demo-pending"
  | "demo-processing"
  | "demo-done"
  | "demo-error"
  | "import-queued"
  | "tracking-active"
  | "tracking-caught-up"
  | "suspicion-clean"
  | "suspicion-review"
  | "suspicion-high"
  | "trace-available"
  | "trace-unavailable"
  | "provenance"

type StatusConfig = {
  label: string
  className: string
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
}

const configs: Record<StatusBadgeVariant, StatusConfig> = {
  neutral: {
    label: "Neutral",
    className: "border-border-subtle bg-surface-raised text-muted-foreground",
    Icon: Circle,
  },
  "demo-pending": {
    label: "Queued",
    className: "border-signal-review/35 bg-signal-review-bg text-signal-review",
    Icon: Clock,
  },
  "demo-processing": {
    label: "Analyzing",
    className: "border-trace-primary/35 bg-provenance-bg text-trace-primary",
    Icon: Activity,
  },
  "demo-done": {
    label: "Analyzed",
    className: "border-signal-clean/35 bg-signal-clean-bg text-signal-clean",
    Icon: CheckCircle,
  },
  "demo-error": {
    label: "Action needed",
    className: "border-signal-high/35 bg-signal-high-bg text-signal-high",
    Icon: XCircle,
  },
  "import-queued": {
    label: "Import queued",
    className: "border-signal-review/35 bg-signal-review-bg text-signal-review",
    Icon: Upload,
  },
  "tracking-active": {
    label: "Tracking active",
    className: "border-trace-primary/35 bg-provenance-bg text-trace-primary",
    Icon: Radio,
  },
  "tracking-caught-up": {
    label: "Tracking caught up",
    className: "border-signal-clean/35 bg-signal-clean-bg text-signal-clean",
    Icon: CheckCircle,
  },
  "suspicion-clean": {
    label: "Low review signal",
    className: "border-signal-clean/35 bg-signal-clean-bg text-signal-clean",
    Icon: CheckCircle,
  },
  "suspicion-review": {
    label: "Review signal",
    className: "border-signal-review/35 bg-signal-review-bg text-signal-review",
    Icon: AlertTriangle,
  },
  "suspicion-high": {
    label: "High review signal",
    className: "border-signal-high/35 bg-signal-high-bg text-signal-high",
    Icon: AlertTriangle,
  },
  "trace-available": {
    label: "TRACE available",
    className: "border-trace-primary/35 bg-provenance-bg text-trace-primary",
    Icon: Shield,
  },
  "trace-unavailable": {
    label: "TRACE unavailable",
    className: "border-border-subtle bg-surface-raised text-muted-foreground",
    Icon: Shield,
  },
  provenance: {
    label: "Provenance",
    className: "border-provenance/35 bg-provenance-bg text-provenance",
    Icon: Database,
  },
}

type StatusBadgeProps = {
  variant: StatusBadgeVariant
  label?: string
  className?: string
}

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  const config = configs[variant]
  const Icon = config.Icon

  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      <span>{label ?? config.label}</span>
    </span>
  )
}

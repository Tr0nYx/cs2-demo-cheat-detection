import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type ConsoleHeaderProps = {
  title: string
  description?: ReactNode
  metadata?: ReactNode
  action?: ReactNode
  notice?: ReactNode
  className?: string
}

export function ConsoleHeader({
  title,
  description,
  metadata,
  action,
  notice,
  className,
}: ConsoleHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          {metadata && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              {metadata}
            </div>
          )}
          <div>
            <h1 className="font-heading text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            {description && (
              <div className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {description}
              </div>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {notice}
    </header>
  )
}

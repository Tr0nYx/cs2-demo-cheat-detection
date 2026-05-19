import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

type ConsolePanelProps = Omit<ComponentProps<"section">, "title"> & {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
}

export function ConsolePanel({
  title,
  description,
  action,
  children,
  className,
  ...props
}: ConsolePanelProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border-subtle bg-surface-panel text-foreground shadow-sm shadow-black/10",
        className
      )}
      {...props}
    >
      {(title || description || action) && (
        <div className="flex flex-col gap-3 border-b border-border-subtle px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title && (
              <h2 className="font-heading text-base font-semibold leading-snug">
                {title}
              </h2>
            )}
            {description && (
              <div className="mt-1 text-sm leading-5 text-muted-foreground">
                {description}
              </div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

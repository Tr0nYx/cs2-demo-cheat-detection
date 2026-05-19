import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

type DataValueProps = ComponentProps<"span"> & {
  children: ReactNode
  truncate?: boolean
}

export function DataValue({
  children,
  truncate = false,
  className,
  title,
  ...props
}: DataValueProps) {
  const textTitle =
    title ?? (typeof children === "string" || typeof children === "number"
      ? String(children)
      : undefined)

  return (
    <span
      title={textTitle}
      className={cn(
        "font-data rounded border border-border-subtle bg-surface-raised px-1.5 py-0.5 text-[0.8125rem] text-foreground",
        truncate && "inline-block max-w-full truncate align-bottom",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

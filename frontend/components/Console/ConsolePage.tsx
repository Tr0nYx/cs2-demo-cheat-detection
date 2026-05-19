import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

type ConsolePageProps = ComponentProps<"main"> & {
  children: ReactNode
  width?: "default" | "wide"
}

export function ConsolePage({
  children,
  className,
  width = "default",
  ...props
}: ConsolePageProps) {
  return (
    <main
      className={cn(
        "min-h-[calc(100vh-73px)] bg-surface-base text-foreground",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8",
          width === "wide" ? "max-w-7xl" : "max-w-6xl"
        )}
      >
        {children}
      </div>
    </main>
  )
}

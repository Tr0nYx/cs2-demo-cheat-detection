import type { ReactNode } from 'react'

type MatchEmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
}

export function MatchEmptyState({ title, description, action }: MatchEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-surface-raised px-4 py-6 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

import { Activity, Crosshair, ListTree, Map } from 'lucide-react'

import { cn } from '@/lib/utils'

export type MatchSectionId = 'overview' | 'rounds' | 'events' | 'viewer'

const sections: Array<{ id: MatchSectionId; label: string; Icon: typeof Activity }> = [
  { id: 'overview', label: 'Overview', Icon: Activity },
  { id: 'rounds', label: 'Rounds', Icon: ListTree },
  { id: 'events', label: 'Events', Icon: Crosshair },
  { id: 'viewer', label: 'Viewer', Icon: Map },
]

type MatchSectionTabsProps = {
  activeSection?: MatchSectionId
}

export function MatchSectionTabs({ activeSection = 'overview' }: MatchSectionTabsProps) {
  return (
    <nav
      aria-label="Match report sections"
      className="sticky top-14 z-10 rounded-lg border border-border-subtle bg-surface-panel/95 p-1 shadow-sm backdrop-blur"
    >
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        {sections.map(({ id, label, Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            className={cn(
              'inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary',
              activeSection === id
                ? 'bg-trace-primary text-surface-base'
                : 'text-muted-foreground hover:bg-surface-raised hover:text-foreground'
            )}
            aria-current={activeSection === id ? 'page' : undefined}
          >
            <Icon className="size-4" aria-hidden />
            <span>{label}</span>
          </a>
        ))}
      </div>
    </nav>
  )
}

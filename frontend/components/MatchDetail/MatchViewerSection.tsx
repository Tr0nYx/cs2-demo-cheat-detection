import { ConsolePanel } from '@/components/Console'
import { DemoViewer } from '@/components/DemoViewer/DemoViewer'
import { MatchEmptyState } from './MatchEmptyState'

type MatchViewerSectionProps = {
  demoId: string
  mapName?: string | null
  analyzed: boolean
}

export function MatchViewerSection({ demoId, mapName, analyzed }: MatchViewerSectionProps) {
  return (
    <ConsolePanel
      title="Viewer and heatmaps"
      description="Replay and heatmap workspace using the existing cached viewer endpoints."
    >
      {!analyzed ? (
        <MatchEmptyState
          title="Viewer data pending"
          description="Round playback and heatmaps become available after the analysis pipeline finishes generating viewer data."
        />
      ) : (
        <DemoViewer demoId={demoId} mapName={mapName ?? 'de_dust2'} analyzed={analyzed} />
      )}
    </ConsolePanel>
  )
}

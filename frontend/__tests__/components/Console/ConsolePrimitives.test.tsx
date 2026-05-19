import { render, screen } from '@testing-library/react'

import {
  ConsoleHeader,
  ConsoleMetric,
  ConsolePage,
  ConsolePanel,
  DataValue,
  ResearchSignalNotice,
  StatusBadge,
} from '@/components/Console'

describe('Console primitives', () => {
  it('renders a console page, header, notice, panel, and metric row', () => {
    render(
      <ConsolePage>
        <ConsoleHeader
          title="Analysis console"
          description="Review post-game demo signals."
          metadata={<DataValue>demo-123</DataValue>}
          notice={<ResearchSignalNotice />}
        />
        <ConsolePanel title="Pipeline state">
          <div className="grid gap-2 sm:grid-cols-2">
            <ConsoleMetric label="Queued" value="3" tone="review" />
            <ConsoleMetric label="Analyzed" value="9" tone="clean" />
          </div>
        </ConsolePanel>
      </ConsolePage>
    )

    expect(
      screen.getByRole('heading', { name: 'Analysis console' })
    ).toBeInTheDocument()
    expect(screen.getByText('demo-123')).toHaveClass('font-data')
    expect(screen.getByText('Pipeline state')).toBeInTheDocument()
    expect(screen.getByText('Queued')).toBeInTheDocument()
    expect(screen.getByText('3')).toHaveClass('font-data')
    expect(screen.getByRole('note')).toHaveTextContent(
      /research signals for human review, not proof/i
    )
  })

  it('renders status variants with text and icons rather than color alone', () => {
    render(
      <div>
        <StatusBadge variant="demo-done" />
        <StatusBadge variant="suspicion-review" />
        <StatusBadge variant="trace-available" />
        <StatusBadge variant="provenance" label="Steam provenance" />
      </div>
    )

    expect(screen.getByText('Analyzed')).toBeInTheDocument()
    expect(screen.getByText('Review signal')).toBeInTheDocument()
    expect(screen.getByText('TRACE available')).toBeInTheDocument()
    expect(screen.getByText('Steam provenance')).toBeInTheDocument()
    expect(screen.getByText('Review signal').parentElement).toHaveClass(
      'text-signal-review'
    )
  })

  it('supports truncated mono data values with a title fallback', () => {
    render(
      <DataValue truncate>
        CSGO-abcde-fghij-klmno-pqrst-uvwxy
      </DataValue>
    )

    const value = screen.getByText('CSGO-abcde-fghij-klmno-pqrst-uvwxy')
    expect(value).toHaveClass('font-data')
    expect(value).toHaveClass('truncate')
    expect(value).toHaveAttribute(
      'title',
      'CSGO-abcde-fghij-klmno-pqrst-uvwxy'
    )
  })

  it('allows concise custom research-signal copy', () => {
    render(
      <ResearchSignalNotice>
        TRACE is a review signal for research, not proof.
      </ResearchSignalNotice>
    )

    expect(screen.getByRole('note')).toHaveTextContent(
      'TRACE is a review signal for research, not proof.'
    )
  })
})

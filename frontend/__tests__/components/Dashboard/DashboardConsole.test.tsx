import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PipelineStatusPanel } from '@/components/Dashboard/PipelineStatusPanel'
import { ScopedDemoList } from '@/components/Dashboard/ScopedDemoList'
import type { DemoSummaryDto } from '@/lib/types'

const demos: DemoSummaryDto[] = [
  {
    id: 'demo-done',
    map: 'Mirage',
    status: 'done',
    uploadedAt: '2026-05-18T10:00:00Z',
    traceAdjusted: 1.12,
    outcome: 'win',
  },
  {
    id: 'demo-pending',
    map: 'Nuke',
    status: 'pending',
    uploadedAt: '2026-05-18T09:00:00Z',
    traceAdjusted: null,
    outcome: null,
  },
  {
    id: 'demo-error',
    map: null,
    status: 'error',
    uploadedAt: '2026-05-18T08:00:00Z',
    traceAdjusted: null,
    outcome: 'loss',
  },
]

describe('Dashboard console panels', () => {
  it('summarizes pipeline statuses and tracking attention', () => {
    render(
      <PipelineStatusPanel
        demos={demos}
        total={3}
        tracking={{
          connected: true,
          status: 'rate_limited',
          connected_since: '2026-05-18T07:00:00Z',
          last_check_at: '2026-05-18T09:30:00Z',
          next_check_at: '2026-05-18T10:30:00Z',
          known_sharecode: null,
          discovered_count: 4,
          queued_count: 3,
          imported_count: 2,
          last_error: null,
        }}
      />
    )

    expect(screen.getByText('Pipeline status')).toBeInTheDocument()
    expect(screen.getByText('Queued')).toBeInTheDocument()
    expect(screen.getByText('Analyzed')).toBeInTheDocument()
    expect(screen.getByText('Backoff')).toBeInTheDocument()
    expect(screen.getByText('Demo and tracking recovery')).toBeInTheDocument()
  })

  it('renders scoped demo rows with status, trace, and map badges', () => {
    render(
      <ScopedDemoList
        demos={demos}
        total={3}
        hasMore={false}
        onDemoSelect={jest.fn()}
        onLoadMore={jest.fn()}
      />
    )

    expect(screen.getByText('demo-done')).toBeInTheDocument()
    expect(screen.getByText('Mirage')).toBeInTheDocument()
    expect(screen.getByText('1.12')).toBeInTheDocument()
    expect(screen.getByText('Analyzed')).toBeInTheDocument()
    expect(screen.getByText('Action needed')).toBeInTheDocument()
  })

  it('renders empty and loading states distinctly', () => {
    const { rerender, container } = render(
      <ScopedDemoList
        demos={[]}
        total={0}
        hasMore={false}
        isLoading
        onDemoSelect={jest.fn()}
        onLoadMore={jest.fn()}
      />
    )

    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3)

    rerender(
      <ScopedDemoList
        demos={[]}
        total={0}
        hasMore={false}
        onDemoSelect={jest.fn()}
        onLoadMore={jest.fn()}
      />
    )

    expect(screen.getByText('No demos in this scope')).toBeInTheDocument()
  })

  it('activates demo rows and load-more controls', async () => {
    const user = userEvent.setup()
    const onDemoSelect = jest.fn()
    const onLoadMore = jest.fn()

    render(
      <ScopedDemoList
        demos={demos}
        total={4}
        hasMore
        onDemoSelect={onDemoSelect}
        onLoadMore={onLoadMore}
      />
    )

    await user.click(screen.getByRole('button', { name: /demo-done/i }))
    await user.click(screen.getByRole('button', { name: /load more demos/i }))

    expect(onDemoSelect).toHaveBeenCalledWith('demo-done')
    expect(onLoadMore).toHaveBeenCalled()
  })
})

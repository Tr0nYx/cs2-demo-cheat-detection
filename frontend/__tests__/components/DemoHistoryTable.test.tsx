import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DemoHistoryTable } from '@/components/DemoHistoryTable'
import { fetchUserDemos } from '@/lib/api'

jest.mock('@/lib/api', () => ({
  fetchUserDemos: jest.fn(),
}))

const mockedFetchUserDemos = fetchUserDemos as jest.Mock

describe('DemoHistoryTable', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders history rows with console status language', async () => {
    mockedFetchUserDemos.mockResolvedValue({
      demos: [
        {
          id: 'demo-history-1',
          status: 'done',
          created_at: '2026-05-18T10:00:00Z',
          results: { overall_score: 72, players: [] },
        },
        {
          id: 'demo-history-2',
          status: 'pending',
          created_at: '2026-05-18T09:00:00Z',
          results: undefined,
        },
      ],
      pagination: { total: 2, page: 1, limit: 20, hasMore: false },
    })

    render(<DemoHistoryTable />)

    expect(screen.getByText(/loading demo history/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText('demo-history-1').length).toBeGreaterThan(0))

    expect(screen.getAllByText('Analyzed').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Queued').length).toBeGreaterThan(0)
    expect(screen.getAllByText('72%').length).toBeGreaterThan(0)
  })

  it('renders empty and error states', async () => {
    mockedFetchUserDemos.mockResolvedValueOnce({
      demos: [],
      pagination: { total: 0, page: 1, limit: 20, hasMore: false },
    })

    const { rerender } = render(<DemoHistoryTable />)
    await waitFor(() => expect(screen.getByText(/no demos uploaded yet/i)).toBeInTheDocument())

    mockedFetchUserDemos.mockRejectedValueOnce(new Error('History unavailable'))
    rerender(<DemoHistoryTable refreshKey={1} />)

    await waitFor(() => expect(screen.getByText('History unavailable')).toBeInTheDocument())
  })

  it('sort controls call the history API with requested order', async () => {
    const user = userEvent.setup()
    mockedFetchUserDemos.mockResolvedValue({
      demos: [
        {
          id: 'demo-sort-1',
          status: 'done',
          created_at: '2026-05-18T10:00:00Z',
          results: { overall_score: 0.4, players: [] },
        },
      ],
      pagination: { total: 1, page: 1, limit: 20, hasMore: false },
    })

    render(<DemoHistoryTable />)
    await waitFor(() => expect(mockedFetchUserDemos).toHaveBeenCalledWith(1, 20, 'date', 'desc'))
    await screen.findAllByText('demo-sort-1')

    await user.click(screen.getByRole('button', { name: /review signal/i }))

    expect(mockedFetchUserDemos).toHaveBeenLastCalledWith(1, 20, 'suspicion', 'desc')
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SteamMatchHistoryCard } from '@/components/SteamMatchHistoryCard'
import { useSteamMatchHistory } from '@/lib/hooks/useSteamMatchHistory'

jest.mock('@/lib/hooks/useSteamMatchHistory', () => ({
  useSteamMatchHistory: jest.fn(),
}))

const mockedUseSteamMatchHistory = useSteamMatchHistory as jest.Mock

describe('SteamMatchHistoryCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders setup form and never includes a free Steam ID field', () => {
    mockedUseSteamMatchHistory.mockReturnValue({
      data: { connected: false, status: 'disconnected' },
      isLoading: false,
      error: null,
      connect: { mutateAsync: jest.fn(), isPending: false },
      disconnect: { mutate: jest.fn(), isPending: false },
    })

    render(<SteamMatchHistoryCard />)

    expect(screen.getByLabelText('Game Authentication Code')).toBeInTheDocument()
    expect(screen.getByLabelText('Seed Sharecode or Link')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Steam ID/i)).not.toBeInTheDocument()
  })

  it('clears plaintext credential after successful connect with launcher link seed', async () => {
    const connect = jest.fn().mockResolvedValue({ connected: true, status: 'active' })
    mockedUseSteamMatchHistory.mockReturnValue({
      data: { connected: false, status: 'disconnected' },
      isLoading: false,
      error: null,
      connect: { mutateAsync: connect, isPending: false },
      disconnect: { mutate: jest.fn(), isPending: false },
    })

    render(<SteamMatchHistoryCard />)

    await userEvent.type(screen.getByLabelText('Game Authentication Code'), 'secret-code')
    await userEvent.type(
      screen.getByLabelText('Seed Sharecode or Link'),
      'steam://rungame/730/76561202255233023/+csgo_download_match%20CSGO-EdFZn-X7w2U-CqbxT-B26nM-TSveM'
    )
    await userEvent.click(screen.getByRole('button', { name: /connect/i }))

    await waitFor(() => expect(connect).toHaveBeenCalledWith({
      steamidkey: 'secret-code',
      seed: 'steam://rungame/730/76561202255233023/+csgo_download_match%20CSGO-EdFZn-X7w2U-CqbxT-B26nM-TSveM',
    }))
    expect(screen.getByLabelText('Game Authentication Code')).toHaveValue('')
  })

  it('disables connect until required inputs are plausible', async () => {
    mockedUseSteamMatchHistory.mockReturnValue({
      data: { connected: false, status: 'disconnected' },
      isLoading: false,
      error: null,
      connect: { mutateAsync: jest.fn(), isPending: false, error: null },
      disconnect: { mutate: jest.fn(), isPending: false },
    })

    render(<SteamMatchHistoryCard />)

    const connectButton = screen.getByRole('button', { name: /connect/i })
    expect(connectButton).toBeDisabled()

    await userEvent.type(screen.getByLabelText('Game Authentication Code'), 'secret-code')
    await userEvent.type(screen.getByLabelText('Seed Sharecode or Link'), 'not-a-sharecode')

    expect(connectButton).toBeDisabled()
    expect(screen.getByText(/enter a CSGO sharecode/i)).toBeInTheDocument()
  })

  it('renders safe connected status without credential material', () => {
    mockedUseSteamMatchHistory.mockReturnValue({
      data: {
        connected: true,
        status: 'caught_up',
        connected_since: '2026-05-18T12:00:00+00:00',
        last_check_at: '2026-05-18T12:10:00+00:00',
        next_check_at: '2026-05-18T12:40:00+00:00',
        known_sharecode: 'CSGO-EDFZN...TSVEM',
        discovered_count: 3,
        queued_count: 2,
        imported_count: 1,
        last_error: null,
      },
      isLoading: false,
      error: null,
      connect: { mutateAsync: jest.fn(), isPending: false },
      disconnect: { mutate: jest.fn(), isPending: false },
    })

    render(<SteamMatchHistoryCard />)

    expect(screen.getAllByText('Tracking caught up').length).toBeGreaterThan(0)
    expect(screen.getByText('CSGO-EDFZN...TSVEM')).toBeInTheDocument()
    expect(screen.queryByText('secret-code')).not.toBeInTheDocument()
    expect(screen.queryByText('ciphertext-secret')).not.toBeInTheDocument()
  })

  it('disconnect action calls mutation', async () => {
    const disconnect = jest.fn()
    mockedUseSteamMatchHistory.mockReturnValue({
      data: {
        connected: true,
        status: 'active',
        connected_since: null,
        last_check_at: null,
        next_check_at: null,
        known_sharecode: 'CSGO-EDFZN...TSVEM',
        discovered_count: 0,
        queued_count: 0,
        imported_count: 0,
        last_error: null,
      },
      isLoading: false,
      error: null,
      connect: { mutateAsync: jest.fn(), isPending: false },
      disconnect: { mutate: disconnect, isPending: false },
    })

    render(<SteamMatchHistoryCard />)
    await userEvent.click(screen.getByRole('button', { name: /disconnect/i }))

    expect(disconnect).toHaveBeenCalled()
  })
})

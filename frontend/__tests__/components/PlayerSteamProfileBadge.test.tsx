import { render, screen } from '@testing-library/react'
import { PlayerSteamProfileBadge } from '@/components/PlayerSteamProfileBadge'

describe('PlayerSteamProfileBadge', () => {
  it('renders Steam profile data when available', () => {
    render(
      <PlayerSteamProfileBadge
        playerName="Fallback"
        steamId="76561198000000000"
        profile={{
          persona_name: 'Research Player',
          avatar_url: 'https://example.test/avatar.jpg',
          profile_url: 'https://steamcommunity.com/profiles/76561198000000000',
          visibility_state: 'public',
          last_refreshed_at: '2026-05-18T10:00:00+00:00',
        }}
      />
    )

    expect(screen.getByText('Research Player')).toBeInTheDocument()
    expect(screen.getByText(/Steam ID: 76561198000000000/)).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://steamcommunity.com/profiles/76561198000000000')
  })

  it('falls back to player name and Steam ID without profile data', () => {
    render(
      <PlayerSteamProfileBadge
        playerName="Known Player"
        steamId="76561198000000001"
        profile={null}
      />
    )

    expect(screen.getByText('Known Player')).toBeInTheDocument()
    expect(screen.getByText(/Steam ID: 76561198000000001/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

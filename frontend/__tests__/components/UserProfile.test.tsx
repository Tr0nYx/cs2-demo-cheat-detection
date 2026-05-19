import { render, screen } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { UserProfile } from '@/components/UserProfile'

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

const mockedUseSession = useSession as jest.Mock

describe('UserProfile', () => {
  beforeEach(() => {
    mockedUseSession.mockReset()
  })

  it('renders Steam profile link for a valid Steam ID', () => {
    mockedUseSession.mockReturnValue({
      data: {
        user: {
          id: '76561198000000001',
          steamId: '76561198000000001',
          name: 'Steam Tester',
          email: 'tester@example.com',
          image: 'https://example.test/avatar.jpg',
        },
        expires: 'never',
      },
      status: 'authenticated',
    })

    render(<UserProfile />)

    expect(screen.getByText('Steam Tester')).toBeInTheDocument()
    expect(screen.getByText(/Steam ID/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View Steam Profile/i })).toHaveAttribute(
      'href',
      'https://steamcommunity.com/profiles/76561198000000001'
    )
  })

  it('does not render Steam profile link for a non-numeric account id', () => {
    mockedUseSession.mockReturnValue({
      data: {
        user: {
          id: '019e3a1d-7c65-78e6-894b-4e0eaadd62ed',
          name: 'UUID User',
          email: 'uuid@example.com',
        },
        expires: 'never',
      },
      status: 'authenticated',
    })

    render(<UserProfile />)

    expect(screen.getByText('UUID User')).toBeInTheDocument()
    expect(screen.getByText(/Account ID/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /View Steam Profile/i })).not.toBeInTheDocument()
  })
})

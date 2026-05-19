import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'

import { Navbar } from '@/components/Navbar'

const signInMock = jest.fn()
const signOutMock = jest.fn()
const useSessionMock = jest.fn()

jest.mock('next/link', () => {
  function MockLink({
    children,
    href,
    ...props
  }: {
    children: ReactNode
    href: string
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }

  MockLink.displayName = 'MockLink'

  return MockLink
})

jest.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
  signOut: (...args: unknown[]) => signOutMock(...args),
  useSession: () => useSessionMock(),
}))

describe('Navbar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useSessionMock.mockReturnValue({ data: null, status: 'unauthenticated' })
  })

  it('keeps public anchors and gives Steam login a visible focus state', async () => {
    render(<Navbar />)

    expect(screen.getByText('Features')).toHaveAttribute('href', '#features')
    expect(screen.getByText('Stats')).toHaveAttribute('href', '#metrics')

    const steamButton = screen.getByRole('button', {
      name: 'Sign in through Steam',
    })
    expect(steamButton).toHaveClass('focus-visible:ring-2')

    await userEvent.click(steamButton)
    expect(signInMock).toHaveBeenCalledWith('steam', {
      callbackUrl: '/dashboard',
    })
  })

  it('renders authenticated console navigation without fragile glyph text', () => {
    useSessionMock.mockReturnValue({
      data: {
        user: { name: 'Steam User', image: 'https://example.test/u.jpg' },
      },
      status: 'authenticated',
    })

    const { container } = render(<Navbar />)

    expect(screen.getAllByText('Dashboard')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Analytics')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Leaderboards')[0]).toBeInTheDocument()
    expect(screen.getAllByText('History')[0]).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/[\u25bc\u00e2]/i)
  })

  it('exposes an accessible mobile menu toggle', async () => {
    useSessionMock.mockReturnValue({
      data: { user: { name: 'Steam User' } },
      status: 'authenticated',
    })

    render(<Navbar />)

    const toggle = screen.getByRole('button', {
      name: 'Open navigation menu',
    })
    expect(toggle).toHaveAttribute('aria-controls', 'mobile-navigation')
    expect(toggle).toHaveClass('focus-visible:ring-2')

    await userEvent.click(toggle)

    expect(
      screen.getByRole('button', { name: 'Close navigation menu' })
    ).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByText('Logout')).toHaveLength(2)
  })
})

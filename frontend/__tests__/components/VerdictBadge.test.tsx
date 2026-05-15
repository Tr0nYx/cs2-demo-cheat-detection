import { render, screen } from '@testing-library/react'
import { VerdictBadge } from '@/components/VerdictBadge'

describe('VerdictBadge', () => {
  it('displays green color for clean score (0-33)', () => {
    render(<VerdictBadge score={25} />)
    const text = screen.getByText(/clean/i)
    expect(text).toBeInTheDocument()
    expect(text).toHaveClass('text-green')
  })

  it('displays orange color for suspicious score (34-66)', () => {
    render(<VerdictBadge score={50} />)
    const text = screen.getByText(/suspicious/i)
    expect(text).toBeInTheDocument()
  })

  it('displays red color for likely cheating score (67-100)', () => {
    render(<VerdictBadge score={80} />)
    const text = screen.getByText(/likely cheating/i)
    expect(text).toBeInTheDocument()
  })

  it('shows score as percentage', () => {
    render(<VerdictBadge score={45} />)
    expect(screen.getByText(/45\/100/)).toBeInTheDocument()
  })

  it('renders with custom size', () => {
    render(<VerdictBadge score={25} size="lg" />)
    const badge = screen.getByText(/clean/i)
    expect(badge).toBeInTheDocument()
  })

  it('hides label when showLabel is false', () => {
    render(<VerdictBadge score={25} showLabel={false} />)
    expect(screen.queryByText(/clean/i)).not.toBeInTheDocument()
    expect(screen.getByText(/25\/100/)).toBeInTheDocument()
  })

  it('rounds scores correctly', () => {
    render(<VerdictBadge score={45.7} />)
    expect(screen.getByText(/46\/100/)).toBeInTheDocument()
  })
})

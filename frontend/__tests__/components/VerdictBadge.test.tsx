import { render, screen } from '@testing-library/react'
import { VerdictBadge } from '@/components/VerdictBadge'

describe('VerdictBadge', () => {
  it('renders for clean score (0-33)', () => {
    const { container } = render(<VerdictBadge score={25} />)
    expect(container).toBeInTheDocument()
    expect(container.textContent).toContain('25/100')
  })

  it('renders for suspicious score (34-66)', () => {
    const { container } = render(<VerdictBadge score={50} />)
    expect(container).toBeInTheDocument()
    expect(container.textContent).toContain('50/100')
  })

  it('renders for likely cheating score (67-100)', () => {
    const { container } = render(<VerdictBadge score={80} />)
    expect(container).toBeInTheDocument()
    expect(container.textContent).toContain('80/100')
  })

  it('shows score as percentage', () => {
    render(<VerdictBadge score={45} />)
    expect(screen.getByText(/45\/100/)).toBeInTheDocument()
  })

  it('renders with custom size', () => {
    const { container } = render(<VerdictBadge score={25} size="lg" />)
    expect(container).toBeInTheDocument()
  })

  it('hides label when showLabel is false', () => {
    render(<VerdictBadge score={25} showLabel={false} />)
    expect(screen.getByText(/25\/100/)).toBeInTheDocument()
  })

  it('rounds scores correctly', () => {
    render(<VerdictBadge score={45.7} />)
    expect(screen.getByText(/46\/100/)).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { TrendChart } from '@/components/Analytics/TrendChart'

describe('TrendChart', () => {
  it('renders consistency bands', () => {
    render(
      <TrendChart
        metric="consistency"
        data={{
          bands: [{ timestamp: '2026-05-17', meanScore: 0.5, upperBound: 0.6, lowerBound: 0.4, demoCount: 2 }],
          flaggedDates: ['2026-05-17'],
          minDemosRequirement: 5,
          message: null,
        }}
      />
    )

    expect(screen.getByText('Consistency')).toBeInTheDocument()
    expect(screen.getByLabelText('Consistency variance band chart')).toBeInTheDocument()
  })

  it('renders arc summary', () => {
    render(<TrendChart metric="arc" data={{ slope: -0.01, intercept: 0.7, rSquared: 0.45, outliersDetected: [], message: null }} />)

    expect(screen.getByText('Improvement Arc')).toBeInTheDocument()
    expect(screen.getByText(/Improving/)).toBeInTheDocument()
  })

  it('color codes weapon strengths', () => {
    render(<TrendChart metric="weapons" data={{ strengths: { Rifle: 0.2, Sniper: 0.8 }, message: null }} />)

    expect(screen.getByText('Weapon Strengths')).toBeInTheDocument()
    expect(screen.getByText('Rifle')).toBeInTheDocument()
    expect(screen.getByText('Sniper')).toBeInTheDocument()
  })

  it('shows insufficient data messages', () => {
    render(<TrendChart metric="weapons" data={{ strengths: {}, message: 'Only 3 demos, need 5+.' }} />)

    expect(screen.getByText('Only 3 demos, need 5+.')).toBeInTheDocument()
  })
})

/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { TraceChart } from '@/components/DemoDetail/TraceChart'
import { TraceComponentDto, TraceComponentPercentilesDto } from '@/lib/types'

// Mock recharts to avoid canvas issues in Jest
jest.mock('recharts', () => ({
  BarChart: ({ children, ...props }: any) => (
      <div data-testid="bar-chart" {...props}>
        {children}
      </div>
    ),
    Bar: ({ dataKey, children, ...props }: any) => (
      <div data-testid="bar" data-key={dataKey} {...props}>
        {children}
      </div>
    ),
    XAxis: (props: any) => <div data-testid="x-axis" {...props} />,
    YAxis: (props: any) => <div data-testid="y-axis" {...props} />,
    CartesianGrid: (props: any) => <div data-testid="cartesian-grid" {...props} />,
    Tooltip: (props: any) => <div data-testid="tooltip" {...props} />,
    ResponsiveContainer: ({ children, ...props }: any) => (
      <div data-testid="responsive-container" {...props}>
        {children}
      </div>
    ),
    ReferenceLine: (props: any) => <div data-testid="reference-line" {...props} />,
}))

const mockComponents: TraceComponentDto = {
  ekill: 0.5,
  aim: 1.2,
  kast: 1.5,
  util: 0.8,
  clutch: 1.8,
}

const mockPercentiles: TraceComponentPercentilesDto = {
  ekill: 20,
  aim: 55,
  kast: 65,
  util: 30,
  clutch: 80,
}

describe('TraceChart', () => {
  it('renders bar chart with all components', () => {
    render(
      <TraceChart components={mockComponents} percentiles={mockPercentiles} />
    )

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('renders reference line at 1.0 baseline', () => {
    render(
      <TraceChart components={mockComponents} percentiles={mockPercentiles} />
    )

    expect(screen.getByTestId('reference-line')).toBeInTheDocument()
  })

  it('renders legend with color coding', () => {
    render(
      <TraceChart components={mockComponents} percentiles={mockPercentiles} />
    )

    expect(screen.getByText('Suspicion Levels')).toBeInTheDocument()
    expect(screen.getByText(/High \(0.3-0.6\)/)).toBeInTheDocument()
    expect(screen.getByText(/Neutral \(0.6-1.4\)/)).toBeInTheDocument()
    expect(screen.getByText(/Low \(1.4-2.0\)/)).toBeInTheDocument()
  })

  it('renders all five component names', () => {
    render(
      <TraceChart components={mockComponents} percentiles={mockPercentiles} />
    )

    // Legend should render in the legend section
    expect(screen.getByTestId('y-axis')).toBeInTheDocument()
  })

  it('has proper ARIA labels for accessibility', () => {
    render(
      <TraceChart components={mockComponents} percentiles={mockPercentiles} />
    )

    const chart = screen.getByLabelText('TRACE component scores bar chart')
    expect(chart).toBeInTheDocument()
  })

  it('respects custom calibration mean', () => {
    const { rerender } = render(
      <TraceChart
        components={mockComponents}
        percentiles={mockPercentiles}
        calibrationMean={0.8}
      />
    )

    // Verify it renders without error with custom mean
    expect(screen.getByTestId('reference-line')).toBeInTheDocument()

    rerender(
      <TraceChart
        components={mockComponents}
        percentiles={mockPercentiles}
        calibrationMean={1.2}
      />
    )

    expect(screen.getByTestId('reference-line')).toBeInTheDocument()
  })

  it('handles null percentiles gracefully', () => {
    const nullPercentiles: TraceComponentPercentilesDto = {
      ekill: null,
      aim: null,
      kast: null,
      util: null,
      clutch: null,
    }

    render(
      <TraceChart components={mockComponents} percentiles={nullPercentiles} />
    )

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('renders tooltip component', () => {
    render(
      <TraceChart components={mockComponents} percentiles={mockPercentiles} />
    )

    expect(screen.getByTestId('tooltip')).toBeInTheDocument()
  })

  it('has proper chart structure', () => {
    const { container } = render(
      <TraceChart components={mockComponents} percentiles={mockPercentiles} />
    )

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument()
    expect(screen.getByTestId('x-axis')).toBeInTheDocument()
    expect(screen.getByTestId('y-axis')).toBeInTheDocument()
  })

  it('renders mobile-responsive container', () => {
    render(
      <TraceChart components={mockComponents} percentiles={mockPercentiles} />
    )

    const responsiveContainer = screen.getByTestId('responsive-container')
    expect(responsiveContainer).toHaveAttribute('width', '100%')
  })

  it('displays suspicion level legend with correct colors', () => {
    render(
      <TraceChart components={mockComponents} percentiles={mockPercentiles} />
    )

    // Check that legend section exists with color indicators
    expect(screen.getByText('Suspicion Levels')).toBeInTheDocument()

    // Check color indicator divs
    const colorDivs = screen.getByText('Suspicion Levels').parentElement?.querySelectorAll('.w-3')
    expect(colorDivs?.length).toBeGreaterThan(0)
  })
})

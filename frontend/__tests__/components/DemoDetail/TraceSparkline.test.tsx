/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { TraceSparkline } from '@/components/DemoDetail/TraceSparkline'
import { TraceHistoryDto } from '@/lib/types'

// Mock recharts
jest.mock('recharts', () => ({
  LineChart: ({ children, ...props }: any) => (
      <div data-testid="line-chart" {...props}>
        {children}
      </div>
    ),
    Line: (props: any) => <div data-testid="line" {...props} />,
    XAxis: (props: any) => <div data-testid="x-axis" {...props} />,
    YAxis: (props: any) => <div data-testid="y-axis" {...props} />,
    CartesianGrid: (props: any) => <div data-testid="cartesian-grid" {...props} />,
    Tooltip: (props: any) => <div data-testid="tooltip" {...props} />,
    ResponsiveContainer: ({ children, width, height, ...props }: any) => {
      const style: any = {}
      if (width) style.width = typeof width === 'number' ? `${width}px` : width
      if (height) style.height = typeof height === 'number' ? `${height}px` : height
      return (
        <div data-testid="responsive-container" width={width} height={height} style={style} {...props}>
          {children}
        </div>
      )
    },
}))

const createHistoryEntry = (
  value: number,
  daysAgo: number = 0
): TraceHistoryDto => ({
  traceBase: value * 0.9,
  traceAdjusted: value,
  traceNormalized: value / 2,
  trustMultiplier: 0.95,
  components: {
    ekill: 0.8,
    aim: 1.0,
    kast: 1.1,
    util: 0.9,
    clutch: 1.2,
  },
  calibrationVersion: 'default-v1',
  calculatedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
  percentiles: {
    ekill: 30,
    aim: 50,
    kast: 55,
    util: 40,
    clutch: 60,
  },
  trustMultiplierPercentile: 45,
  traceAdjustedPercentile: 50,
})

describe('TraceSparkline', () => {
  it('renders empty state when no history provided', () => {
    render(<TraceSparkline history={[]} />)

    expect(screen.getByText('No historical data available')).toBeInTheDocument()
  })

  it('renders line chart with history data', () => {
    const history = [
      createHistoryEntry(0.5, 9),
      createHistoryEntry(0.6, 8),
      createHistoryEntry(0.7, 7),
    ]

    render(<TraceSparkline history={history} />)

    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('detects improving trend', () => {
    const history = [
      createHistoryEntry(0.5, 4),
      createHistoryEntry(0.55, 3),
      createHistoryEntry(0.6, 2),
      createHistoryEntry(0.7, 1),
      createHistoryEntry(0.8, 0),
    ]

    render(<TraceSparkline history={history} showTrend={true} />)

    expect(screen.getByText('Improving')).toBeInTheDocument()
    expect(screen.getByText('↑')).toBeInTheDocument()
  })

  it('detects declining trend', () => {
    const history = [
      createHistoryEntry(0.9, 4),
      createHistoryEntry(0.85, 3),
      createHistoryEntry(0.8, 2),
      createHistoryEntry(0.7, 1),
      createHistoryEntry(0.5, 0),
    ]

    render(<TraceSparkline history={history} showTrend={true} />)

    expect(screen.getByText('Declining')).toBeInTheDocument()
    expect(screen.getByText('↓')).toBeInTheDocument()
  })

  it('detects stable trend', () => {
    const history = [
      createHistoryEntry(0.7, 4),
      createHistoryEntry(0.7, 3),
      createHistoryEntry(0.7, 2),
      createHistoryEntry(0.7, 1),
      createHistoryEntry(0.7, 0),
    ]

    render(<TraceSparkline history={history} showTrend={true} />)

    expect(screen.getByText('Stable')).toBeInTheDocument()
    expect(screen.getByText('→')).toBeInTheDocument()
  })

  it('hides trend indicator when showTrend is false', () => {
    const history = [
      createHistoryEntry(0.5, 2),
      createHistoryEntry(0.6, 1),
      createHistoryEntry(0.7, 0),
    ]

    render(<TraceSparkline history={history} showTrend={false} />)

    expect(screen.queryByText('Improving')).not.toBeInTheDocument()
    expect(screen.queryByText('Declining')).not.toBeInTheDocument()
    expect(screen.queryByText('Stable')).not.toBeInTheDocument()
  })

  it('renders demo count', () => {
    const history = [
      createHistoryEntry(0.5, 4),
      createHistoryEntry(0.6, 3),
      createHistoryEntry(0.7, 2),
      createHistoryEntry(0.8, 1),
      createHistoryEntry(0.9, 0),
    ]

    render(<TraceSparkline history={history} />)

    expect(screen.getByText('(5 demos)')).toBeInTheDocument()
  })

  it('accepts custom height', () => {
    const history = [createHistoryEntry(0.7)]

    const { container } = render(
      <TraceSparkline history={history} height={200} />
    )

    const responsiveContainer = screen.getByTestId('responsive-container')
    expect(responsiveContainer).toHaveStyle({ height: '200px' })
  })

  it('accepts custom width', () => {
    const history = [createHistoryEntry(0.7)]

    render(<TraceSparkline history={history} width="500px" />)

    const responsiveContainer = screen.getByTestId('responsive-container')
    expect(responsiveContainer).toHaveStyle({ width: '500px' })
  })

  it('renders chart components correctly', () => {
    const history = [
      createHistoryEntry(0.5, 2),
      createHistoryEntry(0.6, 1),
      createHistoryEntry(0.7, 0),
    ]

    render(<TraceSparkline history={history} />)

    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('x-axis')).toBeInTheDocument()
    expect(screen.getByTestId('y-axis')).toBeInTheDocument()
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument()
    expect(screen.getByTestId('tooltip')).toBeInTheDocument()
  })

  it('has proper ARIA labels', () => {
    const history = [
      createHistoryEntry(0.5, 2),
      createHistoryEntry(0.6, 1),
      createHistoryEntry(0.7, 0),
    ]

    render(<TraceSparkline history={history} />)

    const chart = screen.getByLabelText('TRACE score trend sparkline')
    expect(chart).toBeInTheDocument()
  })

  it('handles single data point', () => {
    const history = [createHistoryEntry(0.7)]

    render(<TraceSparkline history={history} />)

    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByText('(1 demos)')).toBeInTheDocument()
  })

  it('formats dates in tooltip data', () => {
    const history = [
      createHistoryEntry(0.5, 9),
      createHistoryEntry(0.6, 8),
    ]

    render(<TraceSparkline history={history} />)

    // Chart renders without errors
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('applies responsive container with 100% width by default', () => {
    const history = [createHistoryEntry(0.7)]

    render(<TraceSparkline history={history} />)

    const responsiveContainer = screen.getByTestId('responsive-container')
    expect(responsiveContainer).toHaveAttribute('width', '100%')
  })

  it('renders with improving trend color', () => {
    const history = [
      createHistoryEntry(0.5, 2),
      createHistoryEntry(0.65, 1),
      createHistoryEntry(0.8, 0),
    ]

    render(<TraceSparkline history={history} />)

    const trendElement = screen.getByText('Improving').parentElement
    expect(trendElement).toHaveClass('text-green-600')
  })

  it('renders with declining trend color', () => {
    const history = [
      createHistoryEntry(0.8, 2),
      createHistoryEntry(0.65, 1),
      createHistoryEntry(0.5, 0),
    ]

    render(<TraceSparkline history={history} />)

    const trendElement = screen.getByText('Declining').parentElement
    expect(trendElement).toHaveClass('text-red-600')
  })
})

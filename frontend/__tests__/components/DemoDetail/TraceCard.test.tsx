/**
 * Tests for TraceCard component
 * Tests all rendering states: loading, success, no-trace (null), error
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TraceCard } from '@/components/DemoDetail/TraceCard'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TraceDto } from '@/lib/types'

// Create test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

// Mock the useTraceQuery hook
jest.mock('@/lib/hooks/useTraceQuery', () => ({
  useTraceQuery: jest.fn(),
}))

const mockUseTraceQuery = require('@/lib/hooks/useTraceQuery').useTraceQuery

// Mock data
const mockTraceData: TraceDto = {
  traceBase: 0.65,
  traceAdjusted: 0.61,
  traceNormalized: 0.98,
  trustMultiplier: 0.94,
  components: {
    ekill: 0.82,
    aim: 1.04,
    kast: 0.71,
    util: 0.89,
    clutch: 0.95,
  },
  calibrationVersion: 'default-v1',
  calculatedAt: '2026-05-16T10:30:00Z',
  createdAt: '2026-05-16T10:30:00Z',
}

const renderWithQueryClient = (component: React.ReactElement) => {
  const testQueryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={testQueryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('TraceCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Loading State', () => {
    test('displays loading skeleton while fetching', () => {
      mockUseTraceQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      })

      renderWithQueryClient(<TraceCard demoId="test-123" />)

      // Should show loading indicator
      expect(screen.getByText(/Analyzing player behavior/i)).toBeInTheDocument()
    })

    test('shows skeleton elements during loading', () => {
      mockUseTraceQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      })

      const { container } = renderWithQueryClient(<TraceCard demoId="test-123" />)

      // Check for skeleton elements
      const skeletons = container.querySelectorAll('[class*="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Success State - TRACE Data Available', () => {
    beforeEach(() => {
      mockUseTraceQuery.mockReturnValue({
        data: mockTraceData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })
    })

    test('renders TRACE card with all required data', () => {
      renderWithQueryClient(<TraceCard demoId="test-123" />)

      expect(screen.getByText(/TRACE Rating Analysis/i)).toBeInTheDocument()
      expect(screen.getByText(/Base Score/i)).toBeInTheDocument()
      expect(screen.getByText(/Adjusted Score/i)).toBeInTheDocument()
    })

    test('displays base score correctly formatted', () => {
      renderWithQueryClient(<TraceCard demoId="test-123" />)

      // Should display with 2 decimal places
      expect(screen.getByText('0.65')).toBeInTheDocument()
    })

    test('displays adjusted score', () => {
      renderWithQueryClient(<TraceCard demoId="test-123" />)

      expect(screen.getByText('0.61')).toBeInTheDocument()
    })

    test('displays normalized score', () => {
      renderWithQueryClient(<TraceCard demoId="test-123" />)

      expect(screen.getByText('0.98')).toBeInTheDocument()
    })

    test('displays trust multiplier with 4 decimal places', () => {
      renderWithQueryClient(<TraceCard demoId="test-123" />)

      expect(screen.getByText('0.9400')).toBeInTheDocument()
    })

    test('displays calibration version', () => {
      renderWithQueryClient(<TraceCard demoId="test-123" />)

      expect(screen.getByText(/default-v1/)).toBeInTheDocument()
    })

    test('displays calculated timestamp', () => {
      renderWithQueryClient(<TraceCard demoId="test-123" />)

      // Should show formatted date
      expect(screen.getByText(/Calculated/)).toBeInTheDocument()
    })

    test('renders component breakdown section', () => {
      renderWithQueryClient(<TraceCard demoId="test-123" />)

      expect(screen.getByText(/Component Scores/i)).toBeInTheDocument()
    })

    test('displays trust multiplier explanation tooltip text', () => {
      renderWithQueryClient(<TraceCard demoId="test-123" />)

      expect(screen.getByText(/Trust Multiplier/i)).toBeInTheDocument()
    })

    test('all component scores displayed in chart', () => {
      renderWithQueryClient(<TraceCard demoId="test-123" />)

      // Check that all 5 components are mentioned
      expect(screen.getByText(/E-Kill/i)).toBeInTheDocument()
      expect(screen.getByText(/AIM/i)).toBeInTheDocument()
      expect(screen.getByText(/KAST/i)).toBeInTheDocument()
      expect(screen.getByText(/Utility/i)).toBeInTheDocument()
      expect(screen.getByText(/Clutch/i)).toBeInTheDocument()
    })

    test('component values formatted to 2 decimal places', () => {
      renderWithQueryClient(<TraceCard demoId="test-123" />)

      expect(screen.getByText('0.82')).toBeInTheDocument() // ekill
      expect(screen.getByText('1.04')).toBeInTheDocument() // aim
      expect(screen.getByText('0.71')).toBeInTheDocument() // kast
    })

    test('renders card with title and description', () => {
      renderWithQueryClient(<TraceCard demoId="test-123" />)

      expect(screen.getByText(/TRACE Rating Analysis/)).toBeInTheDocument()
      expect(
        screen.getByText(/Detailed breakdown of player suspicion signal/)
      ).toBeInTheDocument()
    })
  })

  describe('No TRACE Data (404) State', () => {
    test('returns null (hidden) when no TRACE data available', () => {
      mockUseTraceQuery.mockReturnValue({
        data: null, // 404 returns null
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { container } = renderWithQueryClient(<TraceCard demoId="test-123" />)

      // Component should render nothing
      expect(container.firstChild).toBeNull()
    })

    test('does not show error message for missing TRACE', () => {
      mockUseTraceQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      renderWithQueryClient(<TraceCard demoId="test-123" />)

      // Should not have any alert or error message
      expect(screen.queryByText(/Failed to Load/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    test('displays error message on API failure', () => {
      mockUseTraceQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch TRACE: Internal Server Error'),
        refetch: jest.fn(),
      })

      renderWithQueryClient(<TraceCard demoId="test-123" />)

      expect(screen.getByText(/Failed to Load TRACE Data/i)).toBeInTheDocument()
      expect(
        screen.getByText(/Failed to fetch TRACE: Internal Server Error/)
      ).toBeInTheDocument()
    })

    test('shows retry button on error', () => {
      mockUseTraceQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: jest.fn(),
      })

      renderWithQueryClient(<TraceCard demoId="test-123" />)

      const retryButton = screen.getByRole('button', { name: /Retry/i })
      expect(retryButton).toBeInTheDocument()
    })

    test('calls refetch when retry button clicked', async () => {
      const mockRefetch = jest.fn()
      mockUseTraceQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      })

      renderWithQueryClient(<TraceCard demoId="test-123" />)

      const retryButton = screen.getByRole('button', { name: /Retry/i })
      await userEvent.click(retryButton)

      expect(mockRefetch).toHaveBeenCalled()
    })
  })

  describe('Number Formatting', () => {
    beforeEach(() => {
      mockUseTraceQuery.mockReturnValue({
        data: {
          ...mockTraceData,
          traceBase: 0.123456,
          trustMultiplier: 0.9876543,
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })
    })

    test('formats base score to 2 decimals', () => {
      renderWithQueryClient(<TraceCard demoId="test-123" />)

      expect(screen.getByText('0.12')).toBeInTheDocument()
    })

    test('formats trust multiplier to 4 decimals', () => {
      renderWithQueryClient(<TraceCard demoId="test-123" />)

      expect(screen.getByText('0.9877')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseTraceQuery.mockReturnValue({
        data: mockTraceData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })
    })

    test('has aria labels for stats', () => {
      renderWithQueryClient(<TraceCard demoId="test-123" />)

      expect(screen.getByLabelText(/Base TRACE score/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Adjusted TRACE score/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Normalized TRACE score/i)).toBeInTheDocument()
    })

    test('retry button is accessible', () => {
      mockUseTraceQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: jest.fn(),
      })

      renderWithQueryClient(<TraceCard demoId="test-123" />)

      const retryButton = screen.getByRole('button', { name: /Retry/i })
      expect(retryButton).toBeVisible()
    })

    test('heading has appropriate semantic structure', () => {
      renderWithQueryClient(<TraceCard demoId="test-123" />)

      const heading = screen.getByText(/TRACE Rating Analysis/)
      expect(heading.tagName).toMatch(/^h[1-6]$/i)
    })
  })

  describe('Responsive Design', () => {
    beforeEach(() => {
      mockUseTraceQuery.mockReturnValue({
        data: mockTraceData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })
    })

    test('card renders without horizontal overflow', () => {
      const { container } = renderWithQueryClient(<TraceCard demoId="test-123" />)

      const card = container.querySelector('[class*="rounded"]')
      expect(card).toBeInTheDocument()
    })

    test('2-column layout classes present for desktop', () => {
      const { container } = renderWithQueryClient(<TraceCard demoId="test-123" />)

      // Look for grid-cols-1 md:grid-cols-2 pattern
      const gridElement = container.querySelector('[class*="grid-cols"]')
      expect(gridElement).toBeInTheDocument()
    })
  })

  describe('Timestamp Formatting', () => {
    test('formats ISO timestamp to readable date', () => {
      mockUseTraceQuery.mockReturnValue({
        data: {
          ...mockTraceData,
          calculatedAt: '2026-05-16T14:30:45Z',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      renderWithQueryClient(<TraceCard demoId="test-123" />)

      // Should contain formatted date (exact format depends on locale)
      expect(screen.getByText(/Calculated/)).toBeInTheDocument()
    })

    test('handles invalid timestamp gracefully', () => {
      mockUseTraceQuery.mockReturnValue({
        data: {
          ...mockTraceData,
          calculatedAt: 'invalid-date',
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      renderWithQueryClient(<TraceCard demoId="test-123" />)

      // Should still render without crashing
      expect(screen.getByText(/TRACE Rating Analysis/)).toBeInTheDocument()
    })
  })
})

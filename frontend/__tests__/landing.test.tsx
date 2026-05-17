import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import LandingPage from '@/app/page'
import { HeroSection } from '@/components/LandingPage/HeroSection'
import { FeaturesSection } from '@/components/LandingPage/FeaturesSection'
import { PublicMetricsSection } from '@/components/LandingPage/PublicMetricsSection'

// Mock the API module
jest.mock('@/lib/api', () => ({
  fetchPublicMetrics: jest.fn(() =>
    Promise.resolve({
      total_demos: 1234,
      average_suspicion: 45.5,
      total_games_played: 5678,
    })
  ),
}))

describe('Landing Page Components', () => {
  describe('HeroSection', () => {
    it('renders hero section with expected text', () => {
      render(<HeroSection />)

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'CS2 Demo Cheat Detection'
      )
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        'Post-game behavioral analysis powered by data'
      )
      expect(
        screen.getByText(
          /Analyze Counter-Strike 2 demo files to detect suspicious patterns/i
        )
      ).toBeInTheDocument()
    })

    it('renders action buttons', () => {
      render(<HeroSection />)

      expect(screen.getByRole('link', { name: /Learn More/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Get Started/i })).toBeInTheDocument()
    })
  })

  describe('FeaturesSection', () => {
    it('renders feature cards', () => {
      render(<FeaturesSection />)

      expect(screen.getByRole('heading', { name: /Powerful Features/i })).toBeInTheDocument()

      // Check for key features
      expect(screen.getByText(/Upload & Analyze/)).toBeInTheDocument()
      expect(screen.getByText(/Behavioral Analysis/)).toBeInTheDocument()
      expect(screen.getByText(/Leaderboards/)).toBeInTheDocument()
      expect(screen.getByText(/Demo Viewer/)).toBeInTheDocument()
      expect(screen.getByText(/Detailed Statistics/)).toBeInTheDocument()
    })

    it('renders at least 4-5 feature cards', () => {
      const { container } = render(<FeaturesSection />)
      const featureCards = container.querySelectorAll(
        'section > div > div > div'
      )

      expect(featureCards.length).toBeGreaterThanOrEqual(4)
    })
  })

  describe('PublicMetricsSection', () => {
    it('renders loading spinner initially', () => {
      render(<PublicMetricsSection />)

      // Look for spinner or "loading" indicator
      expect(screen.getByRole('heading', { name: /Community Insights/i })).toBeInTheDocument()
    })

    it('renders metrics after loading', async () => {
      render(<PublicMetricsSection />)

      // Wait for metrics to load
      await waitFor(() => {
        expect(screen.getByText(/Demos Analyzed/)).toBeInTheDocument()
      })

      expect(screen.getByText(/Average Suspicion Score/)).toBeInTheDocument()
      expect(screen.getByText(/Games Played/)).toBeInTheDocument()

      // Check that numbers are displayed (not undefined)
      expect(screen.getByText(/1,234/)).toBeInTheDocument()
      expect(screen.getByText(/45.5%/)).toBeInTheDocument()
      expect(screen.getByText(/5,678/)).toBeInTheDocument()
    })
  })

  describe('Landing Page Integration', () => {
    it('renders complete landing page without errors', async () => {
      render(<LandingPage />)

      // Check hero section
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'CS2 Demo Cheat Detection'
      )

      // Check features section
      expect(screen.getByRole('heading', { name: /Powerful Features/i })).toBeInTheDocument()

      // Check metrics section
      await waitFor(() => {
        expect(screen.getByText(/Demos Analyzed/)).toBeInTheDocument()
      })
    })
  })
})

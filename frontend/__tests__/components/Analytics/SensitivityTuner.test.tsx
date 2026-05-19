import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SensitivityTuner } from '@/components/Analytics/SensitivityTuner'
import type { FeatureVectorsDto } from '@/lib/types'

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { accessToken: 'test-token' },
  }),
}))

const vectors: FeatureVectorsDto = {
  aimbotScore: 0.9,
  wallhackScore: 0.1,
  triggerbotScore: 0.8,
  recoilScore: 0.7,
  bhopScore: 0.2,
  sessionScore: 0.6,
}

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('SensitivityTuner', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        baselineSuspicion: 0.51,
        tunedSuspicion: 0.4,
        impactBreakdown: {
          aimbot: -0.25,
          wallhack: 0,
          triggerbot: 0,
          recoil: 0,
          bhop: 0,
          session: 0,
        },
      }),
    }) as jest.Mock
  })

  it('shows an unavailable state when feature vectors are missing', () => {
    renderWithQueryClient(<SensitivityTuner demoId="demo-1" featureVectors={null} />)

    expect(screen.getAllByText('Feature vectors are not available for this demo.')[0]).toBeInTheDocument()
  })

  it('renders scores and feature threshold sliders', () => {
    renderWithQueryClient(
      <SensitivityTuner demoId="demo-1" featureVectors={vectors} baselineSuspicion={0.5} />
    )

    expect(screen.getByText('Sensitivity Tuner')).toBeInTheDocument()
    expect(screen.getByText('0.65')).toBeInTheDocument()
    expect(screen.getByLabelText('Aimbot threshold')).toBeInTheDocument()
    expect(screen.getByLabelText('Session threshold')).toBeInTheDocument()
  })

  it('updates the estimated score when a threshold changes', () => {
    renderWithQueryClient(
      <SensitivityTuner demoId="demo-1" featureVectors={vectors} baselineSuspicion={0.5} />
    )

    fireEvent.change(screen.getByLabelText('Aimbot threshold'), { target: { value: '95' } })

    expect(screen.getByText('0.40')).toBeInTheDocument()
  })
})

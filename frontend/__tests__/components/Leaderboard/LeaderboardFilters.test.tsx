import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeaderboardFilters } from '@/components/Leaderboard/LeaderboardFilters'
import type { LeaderboardFilterCriteria } from '@/lib/types'

const filters: LeaderboardFilterCriteria = {
  map: null,
  ratingBand: null,
  daysBack: null,
  limit: 25,
  offset: 0,
}

describe('LeaderboardFilters', () => {
  it('renders map, rating, and timeframe controls', () => {
    render(<LeaderboardFilters filters={filters} onFilterChange={jest.fn()} />)

    expect(screen.getByRole('button', { name: 'Mirage' })).toBeInTheDocument()
    expect(screen.getByText('Rating Band')).toBeInTheDocument()
    expect(screen.getByText('Timeframe')).toBeInTheDocument()
  })

  it('emits filter changes', async () => {
    const user = userEvent.setup()
    const onFilterChange = jest.fn()
    render(<LeaderboardFilters filters={filters} onFilterChange={onFilterChange} />)

    await user.click(screen.getByRole('button', { name: 'Mirage' }))
    expect(onFilterChange).toHaveBeenCalledWith({ map: 'Mirage' })

    await user.selectOptions(screen.getByLabelText('Rating Band'), '10+')
    expect(onFilterChange).toHaveBeenCalledWith({ ratingBand: '10+' })

    await user.selectOptions(screen.getByLabelText('Timeframe'), '30')
    expect(onFilterChange).toHaveBeenCalledWith({ daysBack: 30 })
  })

  it('clears filters', async () => {
    const user = userEvent.setup()
    const onFilterChange = jest.fn()
    render(<LeaderboardFilters filters={{ ...filters, map: 'Mirage' }} onFilterChange={onFilterChange} />)

    await user.click(screen.getByRole('button', { name: 'Clear leaderboard filters' }))

    expect(onFilterChange).toHaveBeenCalledWith({
      map: null,
      ratingBand: null,
      daysBack: null,
      offset: 0,
    })
  })

  it('disables controls while loading', () => {
    render(<LeaderboardFilters filters={filters} onFilterChange={jest.fn()} isLoading />)

    expect(screen.getByRole('button', { name: 'Mirage' })).toBeDisabled()
    expect(screen.getByLabelText('Rating Band')).toBeDisabled()
  })
})

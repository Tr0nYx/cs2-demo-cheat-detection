import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterSidebar } from '@/components/Analytics/FilterSidebar'
import type { FilterCriteria } from '@/lib/types'

const filters: FilterCriteria = {
  map: null,
  ratingBand: null,
  outcome: null,
  daysBack: null,
  limit: 20,
  offset: 0,
}

describe('FilterSidebar', () => {
  it('renders all selector sections', () => {
    render(<FilterSidebar filters={filters} onUpdateFilters={jest.fn()} />)

    expect(screen.getByText('Map')).toBeInTheDocument()
    expect(screen.getByText('Rating Band')).toBeInTheDocument()
    expect(screen.getByText('Outcome')).toBeInTheDocument()
    expect(screen.getByText('Timeframe')).toBeInTheDocument()
  })

  it('calls onUpdateFilters when selections change', async () => {
    const user = userEvent.setup()
    const onUpdateFilters = jest.fn()
    render(<FilterSidebar filters={filters} onUpdateFilters={onUpdateFilters} />)

    await user.click(screen.getByRole('button', { name: 'Mirage' }))
    expect(onUpdateFilters).toHaveBeenCalledWith({ map: 'Mirage' })

    await user.click(screen.getByLabelText('0-5 RWS'))
    expect(onUpdateFilters).toHaveBeenCalledWith({ ratingBand: '0-5' })

    await user.click(screen.getByLabelText('Wins'))
    expect(onUpdateFilters).toHaveBeenCalledWith({ outcome: 'win' })

    await user.click(screen.getByLabelText('Last 30 days'))
    expect(onUpdateFilters).toHaveBeenCalledWith({ daysBack: 30 })
  })

  it('clears filters', async () => {
    const user = userEvent.setup()
    const onUpdateFilters = jest.fn()
    render(<FilterSidebar filters={{ ...filters, map: 'Mirage' }} onUpdateFilters={onUpdateFilters} />)

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(onUpdateFilters).toHaveBeenCalledWith({
      map: null,
      ratingBand: null,
      outcome: null,
      daysBack: null,
      offset: 0,
    })
  })

  it('disables controls during loading', () => {
    render(<FilterSidebar filters={filters} onUpdateFilters={jest.fn()} isLoading />)

    expect(screen.getByRole('button', { name: 'Mirage' })).toBeDisabled()
    expect(screen.getByLabelText('0-5 RWS')).toBeDisabled()
  })
})

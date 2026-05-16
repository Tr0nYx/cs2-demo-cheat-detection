import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SharecodeTab } from '@/components/DemoImport/SharecodeTab'
import { useImportSharecode } from '@/lib/hooks/useImportSharecode'

// Mock the hook
jest.mock('@/lib/hooks/useImportSharecode')

// Create a test wrapper with React Query provider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('SharecodeTab', () => {
  let mockMutate: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockMutate = jest.fn()
    ;(useImportSharecode as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      isSuccess: false,
      data: null,
      error: null,
    })
  })

  it('renders textarea with placeholder', () => {
    render(<SharecodeTab />, { wrapper: createWrapper() })

    const textarea = screen.getByPlaceholderText(/CSGO-ABCDE/)
    expect(textarea).toBeInTheDocument()
  })

  it('displays count of valid sharecodes', async () => {
    render(<SharecodeTab />, { wrapper: createWrapper() })
    const user = userEvent.setup()

    const textarea = screen.getByPlaceholderText(/CSGO-ABCDE/)
    await user.type(textarea, 'CSGO-ABCDE-FGHIJ-KLMNO-PQRST-UVWXY')

    expect(screen.getByText(/1 sharecode\(s\) ready/)).toBeInTheDocument()
  })

  it('shows invalid format warning for malformed sharecode', async () => {
    render(<SharecodeTab />, { wrapper: createWrapper() })
    const user = userEvent.setup()

    const textarea = screen.getByPlaceholderText(/CSGO-ABCDE/)
    await user.type(textarea, 'INVALID-CODE')

    expect(screen.getByText(/1 invalid format/)).toBeInTheDocument()
  })

  it('disables submit button when no valid sharecodes', () => {
    render(<SharecodeTab />, { wrapper: createWrapper() })

    const button = screen.getByRole('button', { name: /Import Demos/ })
    expect(button).toBeDisabled()
  })

  it('enables submit button with valid sharecode', async () => {
    render(<SharecodeTab />, { wrapper: createWrapper() })
    const user = userEvent.setup()

    const textarea = screen.getByPlaceholderText(/CSGO-ABCDE/)
    await user.type(textarea, 'CSGO-ABCDE-FGHIJ-KLMNO-PQRST-UVWXY')

    const button = screen.getByRole('button', { name: /Import Demos/ })
    expect(button).not.toBeDisabled()
  })

  it('submits multiple sharecodes', async () => {
    render(<SharecodeTab />, { wrapper: createWrapper() })
    const user = userEvent.setup()

    const textarea = screen.getByPlaceholderText(/CSGO-ABCDE/)
    await user.type(
      textarea,
      'CSGO-ABCDE-FGHIJ-KLMNO-PQRST-UVWXY\nCSGO-AAAAA-BBBBB-CCCCC-DDDDD-EEEEE'
    )

    const button = screen.getByRole('button', { name: /Import Demos/ })
    await user.click(button)

    expect(mockMutate).toHaveBeenCalledWith([
      'CSGO-ABCDE-FGHIJ-KLMNO-PQRST-UVWXY',
      'CSGO-AAAAA-BBBBB-CCCCC-DDDDD-EEEEE',
    ])
  })

  it('shows success message on successful submission', () => {
    ;(useImportSharecode as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { queued: 2, failed: 0, imports: { queued: [], failed: [] } },
      error: null,
    })

    render(<SharecodeTab />, { wrapper: createWrapper() })

    expect(screen.getByText(/2 demo\(s\) queued for import/)).toBeInTheDocument()
  })

  it('shows error message on failed submission', () => {
    const testError = new Error('Network error')
    ;(useImportSharecode as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: true,
      isSuccess: false,
      data: null,
      error: testError,
    })

    render(<SharecodeTab />, { wrapper: createWrapper() })

    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('disables textarea while submitting', () => {
    ;(useImportSharecode as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
      isError: false,
      isSuccess: false,
      data: null,
      error: null,
    })

    render(<SharecodeTab />, { wrapper: createWrapper() })

    const textarea = screen.getByPlaceholderText(/CSGO-ABCDE/)
    expect(textarea).toBeDisabled()
  })

  it('shows importing state on button', () => {
    ;(useImportSharecode as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
      isError: false,
      isSuccess: false,
      data: null,
      error: null,
    })

    render(<SharecodeTab />, { wrapper: createWrapper() })

    const button = screen.getByRole('button', { name: /Importing\.\.\./ })
    expect(button).toBeInTheDocument()
  })
})

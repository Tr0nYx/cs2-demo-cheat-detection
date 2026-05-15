import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UploadForm } from '@/components/UploadForm'

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

describe('UploadForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders file input and submit button', () => {
    render(<UploadForm />, { wrapper: createWrapper() })

    expect(screen.getByLabelText(/demo file upload/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload demo/i })).toBeInTheDocument()
  })

  it('renders drag and drop zone', () => {
    render(<UploadForm />, { wrapper: createWrapper() })

    expect(screen.getByText(/drag and drop your .dem file here/i)).toBeInTheDocument()
    expect(screen.getByText(/maximum 100mb/i)).toBeInTheDocument()
  })

  it('renders steam match id field', () => {
    render(<UploadForm />, { wrapper: createWrapper() })

    expect(screen.getByLabelText(/steam match id/i)).toBeInTheDocument()
  })

  it('renders with description text', () => {
    render(<UploadForm />, { wrapper: createWrapper() })

    expect(screen.getByText(/upload a cs2 demo file to analyze/i)).toBeInTheDocument()
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UploadForm } from '@/components/UploadForm'
import * as api from '@/lib/api'

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    post: jest.fn(),
  },
}))

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

    expect(screen.getByLabelText(/upload/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload demo/i })).toBeInTheDocument()
  })

  it('displays file name and size after file selection', async () => {
    const user = userEvent.setup()
    render(<UploadForm />, { wrapper: createWrapper() })

    const mockFile = new File(['content'], 'demo.dem', { type: 'application/octet-stream' })
    const fileInput = screen.getByLabelText(/demo file upload/i) as HTMLInputElement

    await user.upload(fileInput, mockFile)

    await waitFor(() => {
      expect(screen.getByText('demo.dem')).toBeInTheDocument()
    })
  })

  it('shows error for non-.dem files', async () => {
    const user = userEvent.setup()
    render(<UploadForm />, { wrapper: createWrapper() })

    const wrongFile = new File(['content'], 'data.txt', { type: 'text/plain' })
    const fileInput = screen.getByLabelText(/demo file upload/i) as HTMLInputElement

    await user.upload(fileInput, wrongFile)

    await waitFor(() => {
      expect(screen.getByText(/must be a .dem file/i)).toBeInTheDocument()
    })
  })

  it('shows error for files larger than 100MB', async () => {
    const user = userEvent.setup()
    render(<UploadForm />, { wrapper: createWrapper() })

    // Create a file larger than 100MB
    const largeFile = new File(['x'.repeat(101 * 1024 * 1024)], 'large.dem', {
      type: 'application/octet-stream',
    })
    const fileInput = screen.getByLabelText(/demo file upload/i) as HTMLInputElement

    await user.upload(fileInput, largeFile)

    await waitFor(() => {
      expect(screen.getByText(/must be under 100mb/i)).toBeInTheDocument()
    })
  })

  it('disables submit button while uploading', async () => {
    const user = userEvent.setup()
    ;(api.api.post as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ data: { id: '123' } }), 100))
    )

    render(<UploadForm />, { wrapper: createWrapper() })

    const mockFile = new File(['content'], 'demo.dem', { type: 'application/octet-stream' })
    const fileInput = screen.getByLabelText(/demo file upload/i) as HTMLInputElement

    await user.upload(fileInput, mockFile)

    const submitButton = screen.getByRole('button', { name: /upload demo/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })
  })

  it('accepts optional Steam Match ID', async () => {
    const user = userEvent.setup()
    render(<UploadForm />, { wrapper: createWrapper() })

    const steamInput = screen.getByPlaceholderText(/steam match id/i) as HTMLInputElement
    await user.type(steamInput, 'csgo-XXXXXX-XXXXXX')

    expect(steamInput.value).toBe('csgo-XXXXXX-XXXXXX')
  })

  it('shows upload error message on failure', async () => {
    const user = userEvent.setup()
    ;(api.api.post as jest.Mock).mockRejectedValueOnce(new Error('Upload failed'))

    render(<UploadForm />, { wrapper: createWrapper() })

    const mockFile = new File(['content'], 'demo.dem', { type: 'application/octet-stream' })
    const fileInput = screen.getByLabelText(/demo file upload/i) as HTMLInputElement

    await user.upload(fileInput, mockFile)

    const submitButton = screen.getByRole('button', { name: /upload demo/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument()
    })
  })
})

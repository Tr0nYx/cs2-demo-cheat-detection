import { UploadForm } from '@/components/UploadForm'

export default function UploadPage() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-white dark:bg-gray-950">
      <main className="flex flex-1 w-full flex-col items-center justify-center py-8 px-4 gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            CS2 Demo Cheat Detection
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Upload a Counter-Strike 2 demo file for behavioral analysis
          </p>
        </div>

        <UploadForm />

        <footer className="text-sm text-gray-500 dark:text-gray-400 mt-8">
          <p>Research tool for post-game cheat detection analysis</p>
          <p className="mt-2">
            <a href="https://github.com/tronnyx/cs2-demo-cheat-detection" className="text-blue-600 dark:text-blue-400 hover:underline">
              View on GitHub
            </a>
          </p>
        </footer>
      </main>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-950">
      <div className="text-center">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Logging in...
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Please wait while we authenticate with Steam.
        </p>
      </div>
    </div>
  )
}

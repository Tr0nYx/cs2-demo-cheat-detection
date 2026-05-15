import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50">
      <main className="flex flex-1 w-full max-w-2xl flex-col items-center justify-center py-32 px-4 gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            CS2 Demo Cheat Detection
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Upload your Counter-Strike 2 demo file for analysis
          </p>
        </div>

        <div className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <p className="text-gray-600">
            Upload page coming soon...
          </p>
        </div>
      </main>
    </div>
  )
}

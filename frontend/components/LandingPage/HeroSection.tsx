import React from 'react'

export function HeroSection() {
  return (
    <section className="relative w-full py-20 px-4 sm:py-32 bg-gradient-to-br from-gray-900 via-gray-950 to-black">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          CS2 Demo Cheat Detection
        </h1>

        <h2 className="text-xl sm:text-2xl text-gray-300 font-semibold mb-6">
          Post-game behavioral analysis powered by data
        </h2>

        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
          Analyze Counter-Strike 2 demo files to detect suspicious patterns and behaviors.
          Our advanced AI-powered system examines player movements, reactions, and decision-making
          to identify potential cheating indicators with high accuracy.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <a
            href="#features"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Learn More
          </a>
          <a
            href="#login"
            className="px-8 py-3 border-2 border-blue-600 text-blue-400 hover:bg-blue-600/10 font-semibold rounded-lg transition-colors"
          >
            Get Started
          </a>
        </div>
      </div>
    </section>
  )
}

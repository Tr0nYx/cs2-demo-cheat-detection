import React from 'react'

interface Feature {
  icon: string
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: '📁',
    title: 'Upload & Analyze',
    description: 'Submit Counter-Strike 2 demo files for instant analysis. Our system processes them quickly and generates detailed behavioral reports.',
  },
  {
    icon: '🤖',
    title: 'Behavioral Analysis',
    description: 'Advanced pattern detection examines player movements, reaction times, and decision-making to identify suspicious behaviors.',
  },
  {
    icon: '📊',
    title: 'Leaderboards',
    description: 'Compare suspicion scores across players and match them on global leaderboards. Track trends over time.',
  },
  {
    icon: '🎮',
    title: 'Demo Viewer',
    description: 'Interactive 2D radar visualization of player positions, movement patterns, and event timelines from analyzed demos.',
  },
  {
    icon: '📈',
    title: 'Detailed Statistics',
    description: 'Comprehensive metrics including kill/death ratios, accuracy scores, timing analysis, and suspicious event flagging.',
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="w-full py-16 sm:py-24 px-4 bg-white dark:bg-gray-950">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Powerful Features
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Everything you need to analyze and understand Counter-Strike 2 demos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow bg-gray-50 dark:bg-gray-900"
            >
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

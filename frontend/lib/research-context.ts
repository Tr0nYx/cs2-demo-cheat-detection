export const researchDisclaimer =
  'This player profile shows research signals from post-game demo analysis. Scores are for research review only, not proof of cheating.'

export const forbiddenResearchTerms = ['proof', 'cheater', 'ban', 'confirmation']

export function getTraceContextLabel(percentile?: number | null) {
  if (typeof percentile === 'number') {
    return `${Math.round(percentile)}th percentile TRACE score (research signal)`
  }

  return 'TRACE score (research signal)'
}

export function getComponentContextLabel(component: string) {
  return `${component} component pattern (research signal)`
}

export function getDemoHistoryContextLabel() {
  return 'Demo history ordered newest first; TRACE values are research signals.'
}

export function getStatsContextLabel(windowLabel = 'last 30 days') {
  return `Recent activity from ${windowLabel}`
}

export function getSteamContextLabel(label: string) {
  return `${label}: for research reference only`
}

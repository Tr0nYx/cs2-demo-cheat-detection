import fs from 'fs'
import path from 'path'
import { render, screen } from '@testing-library/react'

import { ResearchDisclaimerBanner } from '@/components/ResearchDisclaimerBanner'

const projectRoot = process.cwd()
const matchUiFiles = [
  'app/matches/[demoId]/page.tsx',
  'components/MatchDetail/MatchHeader.tsx',
  'components/MatchDetail/MatchParticipantTable.tsx',
  'components/MatchDetail/MatchSectionTabs.tsx',
  'components/MatchDetail/MatchEmptyState.tsx',
  'components/MatchDetail/MatchRoundsSection.tsx',
  'components/MatchDetail/MatchEventsSection.tsx',
  'components/MatchDetail/MatchViewerSection.tsx',
]

const forbiddenPatterns = [
  /\bcheater\b/i,
  /\bban\b/i,
  /\bconviction\b/i,
  /confirmed cheating/i,
  /(?<!not )\bproof\b/i,
]

describe('Match detail research language', () => {
  it('keeps Phase 24 rendered source copy out of enforcement language', () => {
    const violations = matchUiFiles.flatMap((relativePath) => {
      const absolutePath = path.join(projectRoot, relativePath)
      const source = fs.readFileSync(absolutePath, 'utf8')

      return forbiddenPatterns
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${relativePath}: ${pattern}`)
    })

    expect(violations).toEqual([])
  })

  it('keeps the shared disclaimer explicit about research-only limits', () => {
    render(<ResearchDisclaimerBanner />)

    expect(screen.getByText(/research signals from post-game demo analysis/i)).toBeInTheDocument()
    expect(screen.getByText(/not proof/i)).toBeInTheDocument()
  })
})

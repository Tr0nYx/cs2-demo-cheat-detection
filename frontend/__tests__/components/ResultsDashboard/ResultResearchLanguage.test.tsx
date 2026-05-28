import fs from 'fs'
import path from 'path'

const projectRoot = process.cwd()
const resultUiFiles = [
  'app/results/[id]/page.tsx',
  'components/ResultsDashboard/ResultOverviewPanel.tsx',
  'components/ResultsDashboard/ResultEmptyStates.tsx',
  'components/ResultsDashboard/PlayerEvidenceTable.tsx',
  'components/ResultsDashboard/PlayerEvidenceDetail.tsx',
  'components/ResultsDashboard/ResultDashboardTabs.tsx',
  'lib/result-dashboard.ts',
]

const forbiddenPatterns = [
  /\bcheater\b/i,
  /\bban\b/i,
  /\bconviction\b/i,
  /confirmed cheating/i,
  /(?<!not )\bproof\b/i,
  /Trust Factor/i,
  /Red flag/i,
  /Exonerator/i,
]

describe('Result dashboard research language', () => {
  it('keeps result dashboard source copy out of enforcement language', () => {
    const violations = resultUiFiles.flatMap((relativePath) => {
      const absolutePath = path.join(projectRoot, relativePath)
      const source = fs.readFileSync(absolutePath, 'utf8')

      return forbiddenPatterns
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${relativePath}: ${pattern}`)
    })

    expect(violations).toEqual([])
  })

  it('keeps allowed research vocabulary visible in result dashboard files', () => {
    const combined = resultUiFiles
      .map((relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8'))
      .join('\n')

    expect(combined).toMatch(/research signal/i)
    expect(combined).toMatch(/review signal/i)
    expect(combined).toMatch(/confidence/i)
    expect(combined).toMatch(/evidence/i)
    expect(combined).toMatch(/unavailable/i)
  })
})

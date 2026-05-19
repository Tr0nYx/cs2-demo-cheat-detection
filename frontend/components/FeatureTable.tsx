'use client'

import { useState } from 'react'
import { Fragment } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { verdictColor, verdictLabel } from '@/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Feature } from '@/lib/types'

interface FeatureTableProps {
  features: Feature[]
}

export function FeatureTable({ features }: FeatureTableProps) {
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null)

  if (!features || features.length === 0) {
    return <div className="text-gray-600 dark:text-gray-400">No feature data available</div>
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Feature</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead>Interpretation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {features.map((feature) => (
            <Fragment key={feature.name}>
              <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto"
                    onClick={() =>
                      setExpandedFeature(
                        expandedFeature === feature.name ? null : feature.name
                      )
                    }
                    aria-label={`Toggle ${feature.name} details`}
                  >
                    {expandedFeature === feature.name ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-semibold">{feature.name}</TableCell>
                <TableCell className="text-right">
                  <span className={`font-bold ${verdictColor(feature.score)}`}>
                    {Math.round(feature.score)}
                  </span>
                </TableCell>
                <TableCell className={verdictColor(feature.score)}>
                  {feature.interpretation || verdictLabel(feature.score)}
                </TableCell>
              </TableRow>
              {expandedFeature === feature.name && (
                <TableRow className="bg-surface-raised/70">
                  <TableCell />
                  <TableCell colSpan={3} className="py-3">
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {feature.method && (
                        <div>
                          <span className="font-semibold text-foreground">Method:</span>{' '}
                          <span>{feature.method}</span>
                        </div>
                      )}
                      {(feature.confidence || feature.evidenceStrength) && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {feature.confidence && (
                            <div>
                              <span className="font-semibold text-foreground">Confidence:</span>{' '}
                              <span className="capitalize">{feature.confidence}</span>
                            </div>
                          )}
                          {feature.evidenceStrength && (
                            <div>
                              <span className="font-semibold text-foreground">Evidence Strength:</span>{' '}
                              <span className="capitalize">{feature.evidenceStrength}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {feature.independentSignals && feature.independentSignals.length > 0 && (
                        <div>
                          <span className="font-semibold text-foreground">Detected Signals:</span>{' '}
                          <span>{feature.independentSignals.join(', ')}</span>
                        </div>
                      )}
                      {feature.scoreCapApplied && (
                        <div className="rounded border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-blue-700 dark:text-blue-300">
                          <span className="font-semibold">Calibration Cap Applied:</span>{' '}
                          <span>{feature.scoreCapReason || 'Suspicion score capped due to low sample size or lack of secondary corroboration.'}</span>
                        </div>
                      )}
                      {feature.warning && (
                        <div className="rounded border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-yellow-700 dark:text-yellow-300">
                          {feature.warning}
                        </div>
                      )}
                      {feature.evidence && feature.evidence.length > 0 ? (
                        <ul className="grid gap-1 sm:grid-cols-2">
                          {feature.evidence.map((item) => (
                            <li key={item} className="rounded border border-border-subtle bg-background px-3 py-2">
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No supporting measurements were stored for this feature.</p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

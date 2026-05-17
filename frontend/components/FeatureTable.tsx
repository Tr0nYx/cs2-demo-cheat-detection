'use client'

import { useState } from 'react'
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
            <TableRow key={feature.name} className="hover:bg-gray-50 dark:hover:bg-gray-900">
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
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

import { Badge } from '@/components/ui/badge'
import { verdictColor, verdictLabel } from '@/lib/utils'
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react'

interface VerdictBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function VerdictBadge({ score, size = 'md', showLabel = true }: VerdictBadgeProps) {
  const label = verdictLabel(score)
  const bgColor = verdictColor(score)

  // Determine icon based on score
  const Icon =
    score <= 33 ? CheckCircle : score <= 66 ? AlertCircle : XCircle

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  }

  return (
    <div className={`flex items-center gap-2 ${sizeClasses[size]}`}>
      <Icon className={`w-4 h-4 ${bgColor}`} />
      {showLabel && (
        <span className={`font-semibold ${bgColor}`}>
          {label}
        </span>
      )}
      <span className="text-gray-700 dark:text-gray-300">
        {Math.round(score)}/100
      </span>
    </div>
  )
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Player } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a numeric score (0-1) as a percentage string
 */
export function formatScore(score: number | undefined): string {
  if (score === undefined || score === null) return "N/A"
  const percentage = Math.round(score * 100)
  return `${percentage}%`
}

/**
 * Get the color class for a verdict badge based on overall score
 */
export function verdictColor(score: number | undefined): string {
  if (score === undefined || score === null) return "bg-gray-100 text-gray-800"
  if (score < 0.3) return "bg-green-100 text-green-800"
  if (score < 0.7) return "bg-yellow-100 text-yellow-800"
  return "bg-red-100 text-red-800"
}

/**
 * Get the verdict label based on overall score
 */
export function verdictLabel(score: number | undefined): string {
  if (score === undefined || score === null) return "Unknown"
  if (score < 0.3) return "Clean"
  if (score < 0.7) return "Suspicious"
  return "Likely Cheating"
}

/**
 * Format an ISO timestamp to a readable string
 */
export function formatTimestamp(dateString: string | undefined): string {
  if (!dateString) return "N/A"
  try {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  } catch {
    return "Invalid date"
  }
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return "N/A"
  const units = ["B", "KB", "MB", "GB"]
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`
}

/**
 * Determine overall verdict for a player based on feature scores
 */
export function getOverallVerdict(
  player: Player
): "clean" | "suspicious" | "likely_cheating" {
  if (!player.overallScore) return "clean"
  if (player.overallScore < 0.3) return "clean"
  if (player.overallScore < 0.7) return "suspicious"
  return "likely_cheating"
}

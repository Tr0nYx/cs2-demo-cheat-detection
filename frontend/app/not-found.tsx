import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-white dark:bg-gray-950">
      <main className="flex flex-col items-center justify-center py-8 px-4 max-w-md w-full">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Page Not Found
            </CardTitle>
            <CardDescription>
              The page you're looking for doesn't exist
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              It might have been removed or the URL might be incorrect.
            </p>
            <div className="flex gap-2">
              <Link href="/" className="flex-1">
                <Button className="w-full">
                  Back to Home
                </Button>
              </Link>
              <Link href="/history" className="flex-1">
                <Button variant="outline" className="w-full">
                  View History
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

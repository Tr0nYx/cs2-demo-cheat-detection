'use client'

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UploadForm } from '@/components/UploadForm'
import { SharecodeTab } from '@/components/DemoImport/SharecodeTab'
import { ProgressList } from '@/components/DemoImport/ProgressList'
import { ImportHistory } from '@/components/DemoImport/ImportHistory'

export default function UploadPage() {
  const [importedSharecodes, setImportedSharecodes] = useState<string[]>([])

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-white dark:bg-gray-950">
      <main className="flex flex-1 w-full flex-col items-center justify-center py-8 px-4 gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            CS2 Demo Cheat Detection
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Upload a Counter-Strike 2 demo file for behavioral analysis
          </p>
        </div>

        <div className="w-full max-w-4xl">
          {/* Tab interface */}
          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload File</TabsTrigger>
              <TabsTrigger value="sharecode">Import by Sharecode</TabsTrigger>
            </TabsList>

            {/* Upload File tab (existing) */}
            <TabsContent value="upload" className="space-y-6">
              <UploadForm />
            </TabsContent>

            {/* Import by Sharecode tab (new) */}
            <TabsContent value="sharecode" className="space-y-6">
              <SharecodeTab />

              {/* Progress tracking */}
              <ProgressList sharecodes={importedSharecodes} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Import history (always visible) */}
        <div className="w-full max-w-4xl mt-8">
          <ImportHistory />
        </div>

        <footer className="text-sm text-gray-500 dark:text-gray-400 mt-8">
          <p>Research tool for post-game cheat detection analysis</p>
          <p className="mt-2">
            <a href="https://github.com/tronnyx/cs2-demo-cheat-detection" className="text-blue-600 dark:text-blue-400 hover:underline">
              View on GitHub
            </a>
          </p>
        </footer>
      </main>
    </div>
  )
}

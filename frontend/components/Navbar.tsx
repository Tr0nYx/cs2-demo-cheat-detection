'use client'

import React, { useState } from 'react'
import Link from 'next/link'

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 w-full bg-gray-900 dark:bg-black border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent group-hover:from-blue-400 group-hover:to-blue-500 transition-all">
              CS2CD
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#login"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Stats
            </a>
          </div>

          {/* Login Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                // Placeholder for Steam login - will be wired in Wave 2
                console.log('Steam login clicked')
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              Login with Steam
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden flex flex-col gap-1 p-2"
            >
              <div className="w-6 h-0.5 bg-white rounded transition-all"></div>
              <div className="w-6 h-0.5 bg-white rounded transition-all"></div>
              <div className="w-6 h-0.5 bg-white rounded transition-all"></div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden mt-4 flex flex-col gap-3 pb-4 border-t border-gray-800 pt-4">
            <a
              href="#features"
              className="text-gray-400 hover:text-white transition-colors block"
            >
              Features
            </a>
            <a
              href="#login"
              className="text-gray-400 hover:text-white transition-colors block"
            >
              Stats
            </a>
          </div>
        )}
      </div>
    </nav>
  )
}

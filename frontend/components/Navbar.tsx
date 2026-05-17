'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { signIn, signOut, useSession } from 'next-auth/react'

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { data: session, status } = useSession()

  const handleLogin = async () => {
    await signIn('steam', { callbackUrl: '/dashboard' })
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' })
  }

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
              href="#metrics"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Stats
            </a>
          </div>

          {/* User Menu / Login Button */}
          <div className="flex items-center gap-4">
            {status === 'loading' ? (
              <div className="px-4 py-2 text-gray-400">Loading...</div>
            ) : session?.user ? (
              // Logged in: Show user dropdown
              <div className="relative group">
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap">
                  {session.user.image && (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span className="hidden sm:inline">{session.user.name || 'User'}</span>
                  <span className="text-sm">▼</span>
                </button>

                {/* Dropdown menu */}
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-gray-200 hover:bg-gray-700 rounded-t-lg"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-700 rounded-b-lg border-t border-gray-700"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              // Not logged in: Show Steam login button
              <button
                onClick={handleLogin}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                Login with Steam
              </button>
            )}

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
              href="#metrics"
              className="text-gray-400 hover:text-white transition-colors block"
            >
              Stats
            </a>
            {session?.user && (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-400 hover:text-white transition-colors block"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-left text-gray-400 hover:text-white transition-colors block pt-2 border-t border-gray-700"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

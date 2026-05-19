'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { signIn, signOut, useSession } from 'next-auth/react'
import {
  BarChart3,
  ChevronDown,
  History,
  LayoutDashboard,
  Menu,
  Trophy,
  X,
} from 'lucide-react'

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black'

const authenticatedLinks = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/analytics/trends', label: 'Analytics', Icon: BarChart3 },
  { href: '/leaderboards', label: 'Leaderboards', Icon: Trophy },
  { href: '/dashboard#history', label: 'History', Icon: History },
]

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
    <nav className="sticky top-0 z-50 w-full border-b border-border-subtle bg-gray-950 dark:bg-black">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className={`group flex items-center gap-2 rounded-md ${focusRing}`}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-2xl font-bold text-transparent transition-all group-hover:from-blue-400 group-hover:to-blue-500">
              CS2CD
            </div>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className={`rounded-md text-gray-400 transition-colors hover:text-white ${focusRing}`}
            >
              Features
            </a>
            <a
              href="#metrics"
              className={`rounded-md text-gray-400 transition-colors hover:text-white ${focusRing}`}
            >
              Stats
            </a>
            {session?.user &&
              authenticatedLinks.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-1.5 rounded-md text-gray-300 transition-colors hover:text-white ${focusRing}`}
                >
                  <Icon aria-hidden className="size-4" />
                  {label}
                </Link>
              ))}
          </div>

          <div className="flex items-center gap-4">
            {status === 'loading' ? (
              <div className="px-4 py-2 text-gray-400">Loading...</div>
            ) : session?.user ? (
              <div className="group relative">
                <button
                  data-testid="user-dropdown"
                  className={`flex items-center gap-2 whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 ${focusRing}`}
                  aria-haspopup="menu"
                  aria-expanded="false"
                >
                  {session.user.image && (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="h-6 w-6 rounded-full"
                    />
                  )}
                  <span className="hidden sm:inline">
                    {session.user.name || 'User'}
                  </span>
                  <ChevronDown aria-hidden className="size-4" />
                </button>

                <div
                  role="menu"
                  className="invisible absolute right-0 mt-2 w-56 rounded-lg border border-border-subtle bg-gray-900 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                >
                  {authenticatedLinks.map(({ href, label, Icon }, index) => (
                    <Link
                      key={href}
                      href={href}
                      role="menuitem"
                      className={`flex items-center gap-2 px-4 py-2 text-gray-200 hover:bg-gray-800 ${focusRing} ${
                        index === 0 ? 'rounded-t-lg' : ''
                      }`}
                    >
                      <Icon aria-hidden className="size-4" />
                      {label}
                    </Link>
                  ))}
                  <button
                    onClick={handleLogout}
                    role="menuitem"
                    className={`w-full rounded-b-lg border-t border-gray-700 px-4 py-2 text-left text-gray-200 hover:bg-gray-800 ${focusRing}`}
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className={`whitespace-nowrap rounded-md transition-all hover:opacity-90 active:scale-95 ${focusRing}`}
                aria-label="Sign in through Steam"
              >
                <img
                  src="https://community.cloudflare.steamstatic.com/public/images/signinthroughsteam/sits_02.png"
                  alt="Sign in through Steam"
                  className="block h-[35px] w-auto object-contain"
                />
              </button>
            )}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`inline-flex size-10 items-center justify-center rounded-md text-white md:hidden ${focusRing}`}
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
            >
              {menuOpen ? (
                <X aria-hidden className="size-5" />
              ) : (
                <Menu aria-hidden className="size-5" />
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div
            id="mobile-navigation"
            className="mt-4 flex flex-col gap-3 border-t border-gray-800 pt-4 pb-4 md:hidden"
          >
            <a
              href="#features"
              className={`block rounded-md text-gray-400 transition-colors hover:text-white ${focusRing}`}
            >
              Features
            </a>
            <a
              href="#metrics"
              className={`block rounded-md text-gray-400 transition-colors hover:text-white ${focusRing}`}
            >
              Stats
            </a>
            {session?.user && (
              <>
                {authenticatedLinks.map(({ href, label, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2 rounded-md text-gray-300 transition-colors hover:text-white ${focusRing}`}
                  >
                    <Icon aria-hidden className="size-4" />
                    {label}
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className={`block border-t border-gray-700 pt-2 text-left text-gray-400 transition-colors hover:text-white ${focusRing}`}
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

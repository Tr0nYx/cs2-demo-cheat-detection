import React from 'react'

export function Footer() {
  return (
    <footer className="w-full bg-gray-900 dark:bg-black py-12 px-4 border-t border-gray-800">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="text-white font-semibold mb-3">About</h3>
            <p className="text-gray-400 text-sm">
              CS2 Demo Cheat Detection provides behavioral analysis tools for Counter-Strike 2 demonstrations.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-3">Resources</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/tronnyx/cs2-demo-cheat-detection"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 text-sm transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/tronnyx/cs2-demo-cheat-detection/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 text-sm transition-colors"
                >
                  Report Issues
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-3">Legal</h3>
            <p className="text-gray-400 text-sm">
              Post-game analysis tool for research purposes. Counter-Strike is a trademark of Valve Corporation.
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 pt-8 text-center">
          <p className="text-gray-500 text-sm">
            Copyright © 2024 CS2 Demo Cheat Detection. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

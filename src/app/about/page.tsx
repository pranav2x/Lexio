"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AboutPage() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animations on mount
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-blue-500/5 to-transparent rounded-full" />
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Page heading */}
            <div
              className={`transform transition-all duration-1000 ease-out ${
                isVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              }`}
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-8 tracking-tight">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-300 bg-clip-text text-transparent">
                  About Me
                </span>
              </h1>
            </div>

            {/* Bio content */}
            <div
              className={`transform transition-all duration-1000 ease-out delay-300 ${
                isVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              }`}
            >
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-white">P</span>
                </div>
                
                <p className="text-xl sm:text-2xl text-gray-300 mb-6 leading-relaxed">
                  I am Pranav, a 15 year old who loves coding and creating projects. 
                  Dream is to hopefully work at a YC startup or even start my own.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    <span>Full Stack Developer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full" />
                    <span>15 Years Old</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    <span>Entrepreneur</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Connect section */}
            <div
              className={`transform transition-all duration-1000 ease-out delay-500 ${
                isVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              }`}
            >
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-white mb-4">Connect with me</h3>
                <div className="flex items-center justify-center gap-4">
                  <a
                    href="https://github.com/pranav2x"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white rounded-lg transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    GitHub
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer
          className={`transform transition-all duration-1000 ease-out delay-700 ${
            isVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
        >
          <div className="px-4 py-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
                <a
                  href="https://github.com/pranav2x"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-300 transition-colors duration-200"
                >
                  GitHub
                </a>
                <span className="w-1 h-1 bg-gray-600 rounded-full" />
                <button
                  onClick={() => router.push("/about")}
                  className="hover:text-gray-300 transition-colors duration-200 text-gray-300"
                >
                  About
                </button>
                <span className="w-1 h-1 bg-gray-600 rounded-full" />
                <button
                  onClick={() => router.push("/privacy")}
                  className="hover:text-gray-300 transition-colors duration-200"
                >
                  Privacy
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
} 
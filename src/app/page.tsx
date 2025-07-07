"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animations on mount
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleGetStarted = () => {
    router.push("/app");
  };

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
        {/* Hero section */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Main heading with animation */}
            <div
              className={`transform transition-all duration-1000 ease-out ${
                isVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              }`}
            >
              <h1 className="text-7xl sm:text-8xl lg:text-9xl font-bold text-white mb-8 tracking-tight">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-300 bg-clip-text text-transparent">
                  Lexio
                </span>
              </h1>
            </div>

            {/* Subheading with animation */}
            <div
              className={`transform transition-all duration-1000 ease-out delay-300 ${
                isVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              }`}
            >
              <p className="text-xl sm:text-2xl lg:text-3xl text-gray-300 mb-12 max-w-prose mx-auto leading-relaxed font-light">
                Turn any website into an immersive audio experience.
              </p>
            </div>

            {/* CTA button with animation */}
            <div
              className={`transform transition-all duration-1000 ease-out delay-500 ${
                isVisible
                  ? "translate-y-0 opacity-100 scale-100"
                  : "translate-y-8 opacity-0 scale-95"
              }`}
            >
              <button
                onClick={handleGetStarted}
                className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-2xl hover:from-blue-500 hover:to-purple-500 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
              >
                <span>Try Lexio Now</span>
                <svg
                  className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
                
                {/* Button glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl" />
              </button>
            </div>

            {/* Feature highlights */}
            <div
              className={`transform transition-all duration-1000 ease-out delay-700 ${
                isVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              }`}
            >
              <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9-9a9 9 0 00-9-9m9 9c0 5-4 9-9 9s-9-4-9-9 4-9 9-9 9 4 9 9z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-white mb-2">Any Website</h3>
                  <p className="text-xs text-gray-400">Works with any web page or article</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-white mb-2">AI-Enhanced</h3>
                  <p className="text-xs text-gray-400">Smart text extraction and optimization</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-white mb-2">High Quality</h3>
                  <p className="text-xs text-gray-400">Natural-sounding voice synthesis</p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer
          className={`transform transition-all duration-1000 ease-out delay-1000 ${
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
                  className="hover:text-gray-300 transition-colors duration-200"
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

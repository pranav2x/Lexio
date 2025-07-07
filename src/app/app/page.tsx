"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { scrapeWebsite, isValidUrl } from "@/lib/firecrawl";
import { useLexioActions, useLexioState } from "@/lib/store";

export default function App() {
  const [url, setUrl] = useState("");
  const [useLLMExtraction, setUseLLMExtraction] = useState(true);
  const router = useRouter();
  const { setScrapedData, setLoading, setError, setCurrentUrl } = useLexioActions();
  const { isLoading, error } = useLexioState();

  const handleLexio = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError("Please enter a website URL");
      return;
    }

    if (!isValidUrl(url)) {
      setError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentUrl(url);

    try {
      const result = await scrapeWebsite(url, useLLMExtraction);
      setScrapedData(result);
      router.push("/read");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scrape website");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-blue-500/5 to-transparent rounded-full" />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-2xl mx-auto">
          {/* Back to Landing Button */}
          <div className="mb-8">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Back to Home</span>
            </button>
          </div>

          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-300 bg-clip-text text-transparent">
                Lexio
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 font-light">
              Transform any website into an audio experience
            </p>
          </div>

          <form onSubmit={handleLexio} className="space-y-8">
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-6 py-4 text-lg border-2 border-gray-600 rounded-2xl bg-gray-800/50 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                disabled={isLoading}
              />
              {url && !isValidUrl(url) && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              )}
            </div>

            {/* AI Enhancement Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300">🤖 AI Enhancement</span>
                <div className="group relative">
                  <svg className="w-4 h-4 text-gray-400 hover:text-white transition-colors cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <path d="M12 17h.01"/>
                  </svg>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    Cleans text for better narration
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUseLLMExtraction(!useLLMExtraction)}
                disabled={isLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed ${
                  useLLMExtraction ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useLLMExtraction ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-900/30 backdrop-blur-sm border border-red-500/30 rounded-2xl">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-red-200">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !url || !isValidUrl(url)}
              className="group relative w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-2xl hover:from-blue-500 hover:to-purple-500 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none focus:outline-none focus:ring-4 focus:ring-blue-500/50"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Scraping Website...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  <span>Read This Site</span>
                </>
              )}
              
              {/* Button glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl" />
            </button>
          </form>

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-400 mb-6">
              Try these examples:
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                "https://news.ycombinator.com",
                "https://www.wikipedia.org",
                "https://github.com/trending"
              ].map((exampleUrl) => (
                <button
                  key={exampleUrl}
                  onClick={() => setUrl(exampleUrl)}
                  className="px-4 py-2 text-sm bg-gray-800/50 backdrop-blur-sm text-gray-300 rounded-full hover:bg-gray-700/50 hover:text-white border border-gray-600/50 hover:border-gray-500/50 transition-all duration-200"
                  disabled={isLoading}
                >
                  {new URL(exampleUrl).hostname}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
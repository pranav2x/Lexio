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
    <div className="min-h-screen bg-white text-black font-sans">
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-[600px] mx-auto">
          {/* Back to Home Button */}
          <div className="mb-12">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-gray-400 hover:text-black transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">back to home</span>
            </button>
          </div>

          <div className="text-center mb-16">
            <h1 className="text-5xl sm:text-6xl font-medium tracking-tight mb-6">
              lexio.
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-md mx-auto">
              enter any website url to convert its content into natural speech
            </p>
          </div>

          <form onSubmit={handleLexio} className="space-y-8">
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-3 text-lg border border-gray-200 bg-white text-black placeholder-gray-400 focus:outline-none focus:border-black transition-all duration-200"
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
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">ai enhancement</span>
                <div className="group relative">
                  <svg className="w-4 h-4 text-gray-400 hover:text-black transition-colors cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <path d="M12 17h.01"/>
                  </svg>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    cleans text for better narration
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUseLLMExtraction(!useLLMExtraction)}
                disabled={isLoading}
                className={`relative inline-flex h-6 w-11 items-center transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  useLLMExtraction ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform bg-white transition-transform ${
                    useLLMExtraction ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !url || !isValidUrl(url)}
              className="w-full px-6 py-3 bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  processing...
                </span>
              ) : (
                "convert to speech"
              )}
            </button>
          </form>

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-600 mb-6">
              try these examples:
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
                  className="px-4 py-2 text-sm bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-black border border-gray-200 hover:border-gray-300 transition-all duration-200"
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
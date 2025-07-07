"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { scrapeWebsite, isValidUrl } from "@/lib/firecrawl";
import { useLexioActions, useLexioState } from "@/lib/store";

export default function Home() {
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
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Lexio
            </span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Transform any website into an audio experience
          </p>
        </div>

        <form onSubmit={handleLexio} className="space-y-6">
          <div className="relative">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-4 text-lg border-2 border-border rounded-xl bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
              disabled={isLoading}
            />
            {url && !isValidUrl(url) && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            )}
          </div>

          {/* AI Enhancement Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">🤖 AI Enhancement</span>
              <div className="group relative">
                <svg className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                useLLMExtraction ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
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
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !url || !isValidUrl(url)}
            className="w-full py-4 px-6 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
                <span>Scraping Website...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                <span>Read This Site</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Try these examples:
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              "https://news.ycombinator.com",
              "https://www.wikipedia.org",
              "https://github.com/trending"
            ].map((exampleUrl) => (
              <button
                key={exampleUrl}
                onClick={() => setUrl(exampleUrl)}
                className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded-full hover:bg-accent transition-colors"
                disabled={isLoading}
              >
                {new URL(exampleUrl).hostname}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

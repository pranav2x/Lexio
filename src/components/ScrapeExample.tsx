"use client";

import { useState } from 'react';
import { scrapeWebsite, ScrapeResult, isValidUrl } from '@/lib/firecrawl';

export function ScrapeExample() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScrape = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    if (!isValidUrl(url)) {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const scrapedData = await scrapeWebsite(url);
      setResult(scrapedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Website Scraper</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium mb-2">
              Website URL
            </label>
            <div className="flex gap-2">
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              />
              <button
                onClick={handleScrape}
                disabled={loading || !url}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Scraping...' : 'Scrape'}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-200">✅ Successfully scraped website!</p>
              </div>

              <div className="grid gap-4">
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <h3 className="font-semibold mb-2">Title</h3>
                  <p className="text-sm text-muted-foreground">{result.title}</p>
                </div>

                <div className="p-4 bg-secondary/50 rounded-lg">
                  <h3 className="font-semibold mb-2">Text Content (first 500 chars)</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {result.text.substring(0, 500)}
                    {result.text.length > 500 && '...'}
                  </p>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <span>🎧 TTS-Optimized Text (first 500 chars)</span>
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {result.cleanText.substring(0, 500)}
                    {result.cleanText.length > 500 && '...'}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    This text has been optimized for text-to-speech with cleaner formatting and removed navigation elements.
                  </p>
                </div>

                {result.sections && result.sections.length > 0 && (
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <h3 className="font-semibold mb-2">Sections ({result.sections.length})</h3>
                    <div className="space-y-2">
                      {result.sections.slice(0, 3).map((section, index) => (
                        <div key={index} className="text-sm">
                          <p className="font-medium">{section.title}</p>
                          <p className="text-muted-foreground">
                            {section.content.substring(0, 100)}
                            {section.content.length > 100 && '...'}
                          </p>
                        </div>
                      ))}
                      {result.sections.length > 3 && (
                        <p className="text-sm text-muted-foreground">
                          ... and {result.sections.length - 3} more sections
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-secondary/50 rounded-lg">
                  <h3 className="font-semibold mb-2">HTML Content</h3>
                  <p className="text-sm text-muted-foreground">
                    {result.html ? `${result.html.length} characters of HTML content` : 'No HTML content'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
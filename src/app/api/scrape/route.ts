import { NextRequest, NextResponse } from 'next/server';
import { FirecrawlRequest, FirecrawlResponse, ScrapeResult } from '@/lib/firecrawl';

/**
 * Server-side API route for scraping websites using Firecrawl
 * Keeps API keys secure on the server
 */
export async function POST(request: NextRequest) {
  try {
    // Validate API key on server-side
    console.log('FIRECRAWL_API_KEY', process.env.FIRECRAWL_API_KEY);
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'FIRECRAWL_API_KEY environment variable is required' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { url, useLLMExtraction = true } = body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Valid URL is required' },
        { status: 400 }
      );
    }

    // Prepare request body with optimized settings for TTS
    const requestBody: FirecrawlRequest = {
      url,
      formats: useLLMExtraction ? ['markdown', 'json'] : ['markdown', 'html'],
      onlyMainContent: true,
      // Exclude elements that are not useful for TTS
      excludeTags: [
        'nav', 'footer', 'header', 'aside', 'script', 'style', 'noscript',
        '.navigation', '.nav', '.menu', '.sidebar', '.footer', '.header',
        '.ads', '.advertisement', '.social-media', '.share-buttons',
        '.breadcrumb', '.pagination', '.tags', '.categories',
        '#nav', '#footer', '#header', '#sidebar', '#ads'
      ],
      // Focus on main content elements
      includeTags: [
        'main', 'article', 'section', 'div.content', 'div.main',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li',
        '.content', '.main-content', '.article-content', '.post-content'
      ],
    };

    // Add LLM extraction for cleaner text if requested
    if (useLLMExtraction) {
      requestBody.jsonOptions = {
        prompt: `Extract the main content from this webpage in a clean, readable format optimized for text-to-speech. 
        Focus on the main article or content, exclude navigation, ads, footers, and other non-essential elements. 
        Structure the content with clear paragraphs and maintain logical flow. 
        Remove any formatting that would sound awkward when read aloud (like "Click here", "Learn more", navigation elements, etc.).
        Return the content as clean, flowing text that would sound natural when spoken.`
      };
    }

    // Make API request to Firecrawl
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Firecrawl API error (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    // Parse response
    const data: FirecrawlResponse = await response.json();

    // Check for API-level errors
    if (!data.success || !data.data) {
      return NextResponse.json(
        { error: `Firecrawl API error: ${data.error || 'Unknown error'}` },
        { status: 400 }
      );
    }

    // Import helper functions from firecrawl.ts
    const { 
      sanitizeTextForTTS, 
      cleanMarkdownForTTS, 
      parseMarkdownSections 
    } = await import('@/lib/firecrawl');

    // Extract title from metadata or use default
    const title = data.data.metadata?.title || 'Untitled';
    
    // Extract and clean text content
    let text = '';
    let cleanText = '';

    if (useLLMExtraction && data.data.json) {
      // Use LLM-extracted content as the primary clean text
      if (typeof data.data.json === 'string') {
        try {
          // Try to parse as JSON first
          const parsed = JSON.parse(data.data.json);
          cleanText = parsed.mainContent || data.data.json;
        } catch {
          // If parsing fails, use as-is
          cleanText = data.data.json;
        }
      } else if (typeof data.data.json === 'object' && data.data.json.mainContent) {
        cleanText = data.data.json.mainContent;
      } else {
        cleanText = JSON.stringify(data.data.json);
      }
      cleanText = sanitizeTextForTTS(cleanText);
    }

    // Always process markdown as backup/additional content
    if (data.data.markdown) {
      text = cleanMarkdownForTTS(data.data.markdown);
      
      // If no LLM extraction, use cleaned markdown as clean text
      if (!cleanText) {
        cleanText = text;
      }
    }
    
    // Parse sections from markdown
    const sections = parseMarkdownSections(data.data.markdown || '');

    // Return structured data
    const result: ScrapeResult = {
      title: sanitizeTextForTTS(title),
      text,
      cleanText,
      html: data.data.html || '',
      sections,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in scrape API route:', error);
    
    // Handle different types of errors
    const errorMessage = error instanceof Error 
      ? `Failed to scrape website: ${error.message}`
      : 'Failed to scrape website: Unknown error occurred';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 
/**
 * Firecrawl API integration for web scraping with TTS optimization
 */

// TypeScript interfaces
export interface FirecrawlRequest {
  url: string;
  formats: string[];
  onlyMainContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  jsonOptions?: {
    prompt?: string;
    schema?: object;
  };
}

export interface FirecrawlSection {
  title: string;
  content: string;
  level: number;
}

export interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    rawHtml?: string;
    links?: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extract?: any; // For LLM extraction results (legacy)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json?: any; // For LLM extraction results (current format)
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      sourceURL?: string;
      statusCode?: number;
    };
  };
  error?: string;
}

export interface ScrapeResult {
  title: string;
  text: string;
  cleanText: string; // New field for TTS-optimized text
  html: string;
  sections: FirecrawlSection[];
}

/**
 * Client-side function to scrape a website using our secure API route
 * @param url - The URL to scrape
 * @param useLLMExtraction - Whether to use LLM extraction for cleaner text (default: true)
 * @returns Promise containing the scraped data
 * @throws Error if the request fails
 */
export async function scrapeWebsite(url: string, useLLMExtraction: boolean = true): Promise<ScrapeResult> {
  // Validate URL
  if (!url || typeof url !== 'string') {
    throw new Error('Valid URL is required');
  }

  try {
    // Call our secure API route instead of Firecrawl directly
    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        useLLMExtraction,
      }),
    });

    // Check if response is ok
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error (${response.status})`);
    }

    // Parse and return the response
    const result: ScrapeResult = await response.json();
    return result;

  } catch (error) {
    // Handle different types of errors
    if (error instanceof Error) {
      throw new Error(`Failed to scrape website: ${error.message}`);
    } else {
      throw new Error(`Failed to scrape website: Unknown error occurred`);
    }
  }
}

/**
 * Clean markdown content specifically for TTS
 * @param markdown - The markdown content to clean
 * @returns Cleaned text suitable for TTS
 */
export function cleanMarkdownForTTS(markdown: string): string {
  return markdown
    // Remove markdown formatting
    .replace(/#{1,6}\s+/g, '') // Headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/`(.*?)`/g, '$1') // Inline code
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links - keep text, remove URL
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Images
    .replace(/>\s+/g, '') // Blockquotes
    .replace(/^\s*[-*+]\s+/gm, '') // List markers
    .replace(/^\s*\d+\.\s+/gm, '') // Numbered lists
    .replace(/\|[^|\n]*\|/g, '') // Tables
    .replace(/---+/g, '') // Horizontal rules
    // Clean up spacing and structure
    .replace(/\n{3,}/g, '\n\n') // Multiple newlines
    .replace(/\s+/g, ' ') // Multiple spaces
    .trim();
}

/**
 * Sanitize text specifically for TTS readability
 * @param text - The text to sanitize
 * @returns Text optimized for TTS
 */
export function sanitizeTextForTTS(text: string): string {
  return text
    // Remove common web elements that sound bad in TTS
    .replace(/\b(click here|learn more|read more|see more|view all|show more)\b/gi, '')
    .replace(/\b(home|back to top|skip to content|menu|search)\b/gi, '')
    .replace(/\b(share|tweet|like|follow|subscribe)\b/gi, '')
    .replace(/\b(next|previous|prev|continue reading)\b/gi, '')
    // Remove special characters that don't read well
    .replace(/[«»""'']/g, '"') // Normalize quotes
    .replace(/[–—]/g, '-') // Normalize dashes
    .replace(/\s*\|\s*/g, '. ') // Replace pipes with periods
    .replace(/\s*>\s*/g, '. ') // Replace arrows with periods
    .replace(/\s*»\s*/g, '. ') // Replace breadcrumb separators
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .replace(/\.\s*\./g, '.') // Remove double periods
    .replace(/\s+([.!?])/g, '$1') // Remove space before punctuation
    .trim();
}

/**
 * Parse markdown content into sections with TTS optimization
 * @param markdown - The markdown content to parse
 * @returns Array of sections optimized for TTS
 */
export function parseMarkdownSections(markdown: string): FirecrawlSection[] {
  const sections: FirecrawlSection[] = [];
  const lines = markdown.split('\n');
  let currentSection: FirecrawlSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check for headers
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      // Save previous section if exists
      if (currentSection && currentSection.content.trim()) {
        currentSection.content = sanitizeTextForTTS(currentSection.content);
        sections.push(currentSection);
      }
      
      // Start new section
      currentSection = {
        title: sanitizeTextForTTS(headerMatch[2]),
        content: '',
        level: headerMatch[1].length,
      };
    } else if (currentSection && trimmed) {
      // Add content to current section (clean it first)
      const cleanedLine = cleanMarkdownForTTS(line);
      if (cleanedLine.trim()) {
        currentSection.content += cleanedLine + ' ';
      }
    }
  }
  
  // Add final section
  if (currentSection && currentSection.content.trim()) {
    currentSection.content = sanitizeTextForTTS(currentSection.content);
    sections.push(currentSection);
  }
  
  return sections;
}

/**
 * Validates if a URL is properly formatted
 * @param url - The URL to validate
 * @returns boolean indicating if the URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes text content by removing excessive whitespace
 * @param text - The text to sanitize
 * @returns Cleaned text
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts a summary from the scraped text (first 200 characters)
 * @param text - The full text content
 * @returns Summary string
 */
export function extractSummary(text: string, maxLength: number = 200): string {
  const cleaned = sanitizeText(text);
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  
  const truncated = cleaned.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  if (lastSpaceIndex > 0) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }
  
  return truncated + '...';
} 
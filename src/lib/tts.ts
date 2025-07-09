/**
 * Text-to-Speech integration using ElevenLabs API with development caching
 */

export interface TTSOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface TTSResult {
  audioUrl: string;
  audioBlob: Blob;
  duration?: number;
  fromCache?: boolean;
}

interface CachedAudio {
  audioData: string; // Base64 encoded audio
  timestamp: number;
  textHash: string;
  voiceSettings: string;
}

/**
 * Default TTS configuration
 */
const DEFAULT_TTS_OPTIONS: Required<TTSOptions> = {
  voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam voice - good for narration
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.0,
  useSpeakerBoost: true,
};

/**
 * Development cache settings
 */
const DEV_CACHE_KEY = 'narrate-dev-tts-cache';
const DEV_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const DEV_CACHE_MAX_SIZE = 50; // Maximum number of cached items

/**
 * Check if we're in development mode
 */
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Generate a simple hash for text content
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate cache key from text and voice settings
 */
function generateCacheKey(text: string, options: Required<TTSOptions>): string {
  const textHash = simpleHash(text.trim().toLowerCase());
  const settingsHash = simpleHash(JSON.stringify({
    voiceId: options.voiceId,
    stability: options.stability,
    similarityBoost: options.similarityBoost,
    style: options.style,
    useSpeakerBoost: options.useSpeakerBoost,
  }));
  return `${textHash}-${settingsHash}`;
}

/**
 * Get cached audio from localStorage (development only)
 */
function getCachedAudio(cacheKey: string): CachedAudio | null {
  if (!isDevelopment || typeof window === 'undefined') return null;
  
  try {
    const cacheData = localStorage.getItem(DEV_CACHE_KEY);
    if (!cacheData) return null;
    
    const cache = JSON.parse(cacheData);
    const item = cache[cacheKey];
    
    if (!item) return null;
    
    // Check if cache item is still valid (not expired)
    if (Date.now() - item.timestamp > DEV_CACHE_MAX_AGE) {
      // Remove expired item
      delete cache[cacheKey];
      localStorage.setItem(DEV_CACHE_KEY, JSON.stringify(cache));
      return null;
    }
    
    return item;
  } catch (error) {
    console.debug('Error reading TTS cache:', error);
    return null;
  }
}

/**
 * Cache audio data in localStorage (development only)
 */
function setCachedAudio(cacheKey: string, audioBlob: Blob, textHash: string, voiceSettings: string): void {
  if (!isDevelopment || typeof window === 'undefined') return;
  
  try {
    // Convert blob to base64 for storage
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const base64Data = reader.result as string;
        
        const cacheData = localStorage.getItem(DEV_CACHE_KEY);
        const cache = cacheData ? JSON.parse(cacheData) : {};
        
        // Add new item
        cache[cacheKey] = {
          audioData: base64Data,
          timestamp: Date.now(),
          textHash,
          voiceSettings,
        };
        
        // Limit cache size
        const keys = Object.keys(cache);
        if (keys.length > DEV_CACHE_MAX_SIZE) {
          // Remove oldest items
          const sortedKeys = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
          const toRemove = sortedKeys.slice(0, keys.length - DEV_CACHE_MAX_SIZE);
          toRemove.forEach(key => delete cache[key]);
        }
        
        localStorage.setItem(DEV_CACHE_KEY, JSON.stringify(cache));
        console.log(`🎵 TTS: Cached audio for development (${Object.keys(cache).length}/${DEV_CACHE_MAX_SIZE})`);
        console.log(`💾 TTS: Cache key "${cacheKey}" stored successfully`);
      } catch (error) {
        console.error('❌ Error caching TTS audio:', error);
      }
    };
    reader.readAsDataURL(audioBlob);
  } catch (error) {
    console.debug('Error setting TTS cache:', error);
  }
}

/**
 * Convert base64 data URL to blob
 */
function dataURLToBlob(dataURL: string): Blob {
  const byteString = atob(dataURL.split(',')[1]);
  const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([ab], { type: mimeString });
}

/**
 * Generates speech audio from text using our secure API route
 * @param text - The text to convert to speech
 * @param options - TTS configuration options
 * @returns Promise containing audio URL and blob
 * @throws Error if the request fails
 */
export async function generateSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<TTSResult> {
  // Validate text
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Valid text is required for speech generation');
  }

  // Merge options with defaults
  const config = { ...DEFAULT_TTS_OPTIONS, ...options };

  // Check development cache first
  if (isDevelopment && typeof window !== 'undefined') {
    const cacheKey = generateCacheKey(text, config);
    const cachedAudio = getCachedAudio(cacheKey);
    
    if (cachedAudio) {
      try {
        const audioBlob = dataURLToBlob(cachedAudio.audioData);
        const audioUrl = URL.createObjectURL(audioBlob);
        
        console.log('🎵 TTS: Using cached audio (saved API credits!)');
        
        return {
          audioUrl,
          audioBlob,
          duration: estimateTextDuration(text),
          fromCache: true,
        };
      } catch (error) {
        console.debug('Error loading cached audio, falling back to API:', error);
      }
    }
  }

  try {
    // Call our secure API route instead of ElevenLabs directly
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.trim(),
        voiceId: config.voiceId,
        stability: config.stability,
        similarityBoost: config.similarityBoost,
        style: config.style,
        useSpeakerBoost: config.useSpeakerBoost,
      }),
    });

    // Check if response is ok
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error (${response.status})`);
    }

    // Get audio blob
    const audioBlob = await response.blob();

    // Create object URL
    const audioUrl = URL.createObjectURL(audioBlob);

    const result: TTSResult = {
      audioUrl,
      audioBlob,
      duration: estimateTextDuration(text),
    };

    // Cache the result for development
    if (isDevelopment && typeof window !== 'undefined') {
      const cacheKey = generateCacheKey(text, config);
      const textHash = simpleHash(text);
      const voiceSettings = JSON.stringify(config);
      setCachedAudio(cacheKey, audioBlob, textHash, voiceSettings);
    }

    return result;

  } catch (error) {
    // Handle different types of errors
    if (error instanceof Error) {
      throw new Error(`Failed to generate speech: ${error.message}`);
    } else {
      throw new Error(`Failed to generate speech: Unknown error occurred`);
    }
  }
}

/**
 * Cleans up an audio URL created by generateSpeech
 * @param audioUrl - The URL to clean up
 */
export function cleanupAudioUrl(audioUrl: string): void {
  if (audioUrl && audioUrl.startsWith('blob:')) {
    URL.revokeObjectURL(audioUrl);
  }
}

/**
 * Clear development TTS cache (development only)
 */
export function clearTTSCache(): boolean {
  if (!isDevelopment || typeof window === 'undefined') return false;
  
  try {
    localStorage.removeItem(DEV_CACHE_KEY);
    console.log('🗑️ TTS: Development cache cleared');
    return true;
  } catch (error) {
    console.debug('Error clearing TTS cache:', error);
    return false;
  }
}

/**
 * Debug function to inspect cache contents (development only)
 */
export function inspectTTSCache(): void {
  if (!isDevelopment || typeof window === 'undefined') {
    console.log('❌ Cache inspection only available in development');
    return;
  }
  
  try {
    const cacheData = localStorage.getItem(DEV_CACHE_KEY);
    console.log('🔍 TTS Cache Inspection:');
    console.log('📦 Cache Key:', DEV_CACHE_KEY);
    console.log('📊 Raw Data Exists:', !!cacheData);
    
    if (cacheData) {
      const cache = JSON.parse(cacheData);
      const keys = Object.keys(cache);
      console.log('📝 Number of cached items:', keys.length);
      console.log('🔑 Cache keys:', keys);
      
      keys.forEach((key, index) => {
        const item = cache[key];
        const age = Date.now() - item.timestamp;
        const ageMinutes = Math.round(age / (1000 * 60));
        console.log(`   ${index + 1}. Key: ${key}, Age: ${ageMinutes} minutes`);
      });
      
      const sizeKB = (new Blob([cacheData]).size / 1024).toFixed(1);
      console.log('💾 Total cache size:', `${sizeKB} KB`);
    } else {
      console.log('📝 No cached data found');
    }
  } catch (error) {
    console.error('❌ Error inspecting cache:', error);
  }
}

// Make cache inspection available globally in development
if (isDevelopment && typeof window !== 'undefined') {
  (window as any).inspectTTSCache = inspectTTSCache;
  console.log('🔧 Dev Tool Available: Type "inspectTTSCache()" in console to inspect TTS cache');
}

/**
 * Get TTS cache statistics (development only)
 */
export function getTTSCacheStats(): { count: number; size: string; enabled: boolean } | null {
  if (!isDevelopment || typeof window === 'undefined') {
    return { count: 0, size: '0 KB', enabled: false };
  }
  
  try {
    const cacheData = localStorage.getItem(DEV_CACHE_KEY);
    
    if (!cacheData) {
      return { count: 0, size: '0 KB', enabled: true };
    }
    
    const cache = JSON.parse(cacheData);
    const count = Object.keys(cache).length;
    const sizeBytes = new Blob([cacheData]).size;
    const sizeKB = (sizeBytes / 1024).toFixed(1);
    
    return { count, size: `${sizeKB} KB`, enabled: true };
  } catch (error) {
    console.debug('Error getting TTS cache stats:', error);
    return { count: 0, size: '0 KB', enabled: true };
  }
}

/**
 * Splits long text into smaller chunks for better TTS processing
 * @param text - The text to split
 * @param maxLength - Maximum length per chunk (default: 2500)
 * @returns Array of text chunks
 */
export function splitTextForTTS(text: string, maxLength: number = 2500): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length + 1 <= maxLength) {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk + '.');
      }
      currentChunk = trimmedSentence;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk + '.');
  }
  
  return chunks;
}

/**
 * Estimates the duration of text when spoken
 * @param text - The text to estimate
 * @param wordsPerMinute - Speaking rate (default: 150)
 * @returns Estimated duration in seconds
 */
export function estimateTextDuration(text: string, wordsPerMinute: number = 150): number {
  const wordCount = text.split(/\s+/).length;
  return Math.ceil((wordCount / wordsPerMinute) * 60);
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  samples: string[] | null;
  category: string;
  fine_tuning: {
    language: string | null;
    is_allowed_to_fine_tune: boolean;
    finetuning_state: string;
    verification_attempts: number | null;
    verification_failures: string[];
    verification_attempts_count: number;
    slice_ids: string[] | null;
    manual_verification: string | null;
    manual_verification_requested: boolean;
  };
  labels: Record<string, string>;
  description: string | null;
  preview_url: string | null;
  available_for_tiers: string[];
  settings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  } | null;
  sharing: {
    status: string;
    history_item_sample_id: string | null;
    original_voice_id: string | null;
    public_owner_id: string | null;
    liked_by_count: number;
    cloned_by_count: number;
    whitelisted_emails: string[] | null;
    name: string | null;
    description: string | null;
    labels: Record<string, string> | null;
    enabled_in_library: boolean;
  } | null;
  high_quality_base_model_ids: string[];
  safety_control: string | null;
  voice_verification: {
    requires_verification: boolean;
    is_verified: boolean;
    verification_failures: string[];
    verification_attempts_count: number;
    language: string | null;
  };
  permission_on_resource: string | null;
}

/**
 * Gets available voices from our secure API route
 * @returns Promise containing available voices
 */
export async function getAvailableVoices(): Promise<ElevenLabsVoice[]> {
  try {
    const response = await fetch('/api/tts', {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error (${response.status})`);
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error('Failed to fetch voices:', error);
    return [];
  }
} 
/**
 * Text-to-Speech integration using ElevenLabs API with real character-level alignment
 */

// Import the new IndexedDB cache functions
import { 
  getAudioFromCache, 
  setAudioInCache, 
  generateCacheKey,
  clearTTSCache as clearTTSCacheIndexedDB,
  getTTSCacheStats as getTTSCacheStatsIndexedDB
} from './ttsCache';

export interface TTSOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface WordTiming {
  text: string;
  start: number;
  end: number;
}

export interface TTSResult {
  audioUrl: string;
  audioBlob: Blob;
  duration?: number;
  fromCache?: boolean;
  wordTimings?: WordTiming[];
}

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
  accent: string;
}

interface QueuedRequest {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: () => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve: (value: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reject: (error: any) => void;
  retryCount: number;
  maxRetries: number;
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

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'sarah',
    name: 'Sarah',
    description: 'A popular and versatile voice',
    gender: 'female',
    accent: 'American'
  },
  {
    id: 'heart',
    name: 'Heart',
    description: 'A warm and engaging voice',
    gender: 'female',
    accent: 'American'
  },
  {
    id: 'leto',
    name: 'Leto',
    description: 'A clear and professional voice',
    gender: 'male',
    accent: 'American'
  }
];

const DEFAULT_TTS_OPTIONS: Required<TTSOptions> = {
  voiceId: 'sarah',
  stability: 0.4,
  similarityBoost: 0.8,
  style: 0.0,
  useSpeakerBoost: true,
};

class TTSRequestQueue {
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private readonly delayBetweenRequests = 1000;
  private readonly maxRetries = 3;

  async add<T>(id: string, requestFn: () => Promise<T>, maxRetries: number = this.maxRetries): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id,
        execute: requestFn,
        resolve,
        reject,
        retryCount: 0,
        maxRetries
      };

      this.queue.push(queuedRequest);
      console.log(`TTS: Added request to queue (${this.queue.length} pending): ${id}`);
      
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`TTS: Processing queue (${this.queue.length} requests)`);

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      
      try {
        console.log(`TTS: Executing request: ${request.id} (attempt ${request.retryCount + 1}/${request.maxRetries + 1})`);
        
        const result = await request.execute();
        request.resolve(result);
        
        console.log(`TTS: Request completed: ${request.id}`);
        
        if (this.queue.length > 0) {
          console.log(`TTS: Waiting ${this.delayBetweenRequests}ms before next request...`);
          await new Promise(resolve => setTimeout(resolve, this.delayBetweenRequests));
        }
        
      } catch (error) {
        console.error(`TTS: Request failed: ${request.id}`, error);
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isRetryable = errorMessage.includes('429') || 
                           errorMessage.includes('too_many_concurrent_requests') ||
                           errorMessage.includes('500') ||
                           errorMessage.includes('network') ||
                           errorMessage.includes('fetch');
        
        if (isRetryable && request.retryCount < request.maxRetries) {
          request.retryCount++;
          const retryDelay = Math.min(1000 * Math.pow(2, request.retryCount), 5000);
          
          console.log(`TTS: Retrying request ${request.id} in ${retryDelay}ms (attempt ${request.retryCount + 1}/${request.maxRetries + 1})`);
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          this.queue.unshift(request);
        } else {
          console.error(`TTS: Request failed permanently: ${request.id}`);
          request.reject(error);
        }
      }
    }

    this.isProcessing = false;
    console.log(`TTS: Queue processing completed`);
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  isQueueProcessing(): boolean {
    return this.isProcessing;
  }

  clearQueue(): void {
    const clearedCount = this.queue.length;
    this.queue.forEach(request => {
      request.reject(new Error('Request cancelled - queue cleared'));
    });
    this.queue = [];
    console.log(`TTS: Cleared ${clearedCount} requests from queue`);
  }
}

const ttsQueue = new TTSRequestQueue();

// Old localStorage caching functions removed - now using IndexedDB via ttsCache.ts

export async function generateSpeech(
  text: string,
  options: TTSOptions = {},
  selectedVoiceId?: string
): Promise<TTSResult> {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    console.error('generateSpeech called with invalid text:', { text, type: typeof text, length: text?.length });
    throw new Error('Valid text is required for speech generation');
  }

  console.log('generateSpeech called with:', {
    textLength: text.length,
    selectedVoiceId
  });

  const config = { 
    ...DEFAULT_TTS_OPTIONS, 
    ...options,
    ...(selectedVoiceId && { voiceId: selectedVoiceId }),
  };

  // Generate cache key for this request
  const cacheKey = generateCacheKey(text.trim(), config.voiceId);
  
  // Check cache first
  try {
    const cachedAudio = await getAudioFromCache(cacheKey);
    if (cachedAudio) {
      console.log(`🎉 TTS: Cache hit for request`);
      const audioUrl = URL.createObjectURL(cachedAudio.audioBlob);
      return {
        audioUrl,
        audioBlob: cachedAudio.audioBlob,
        wordTimings: cachedAudio.wordTimings,
        fromCache: true
      };
    }
  } catch (error) {
    console.warn('Cache lookup failed, proceeding with API call:', error);
  }

  try {
    const requestId = `tts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const data = await ttsQueue.add(requestId, async () => {
      console.log(`TTS: Making API call for request: ${requestId}`);
      
      const response = await fetch('/api/tts-with-timing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          voice_id: config.voiceId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || `API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    });
    
    const audioBytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);

    // Cache the result after successful API call
    try {
      await setAudioInCache(cacheKey, audioBlob, data.wordTimings || []);
      console.log(`💾 TTS: Audio cached successfully`);
    } catch (error) {
      console.warn('Failed to cache audio:', error);
    }

    const result: TTSResult = {
      audioUrl,
      audioBlob,
      duration: data.duration,
      wordTimings: data.wordTimings,
      fromCache: false
    };

    console.log('Generated speech with word timings:', data.wordTimings?.length || 0, 'words');

    return result;

  } catch (error) {
    console.error('generateSpeech error:', error);
    throw error;
  }
}

// Function for pre-warming the cache without creating object URLs
export async function fetchAndCacheSpeech(
  text: string,
  options: TTSOptions = {},
  selectedVoiceId?: string
): Promise<void> {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    console.warn('fetchAndCacheSpeech called with invalid text');
    return;
  }

  const config = { 
    ...DEFAULT_TTS_OPTIONS, 
    ...options,
    ...(selectedVoiceId && { voiceId: selectedVoiceId }),
  };

  // Generate cache key for this request
  const cacheKey = generateCacheKey(text.trim(), config.voiceId);
  
  // Check if already cached
  try {
    const cachedAudio = await getAudioFromCache(cacheKey);
    if (cachedAudio) {
      console.log(`🔥 Pre-warm cache: Already cached`);
      return; // Already cached, no need to fetch
    }
  } catch (error) {
    console.warn('Cache lookup failed during pre-warm:', error);
  }

  // Not cached, fetch and cache it
  try {
    const requestId = `prewarm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const data = await ttsQueue.add(requestId, async () => {
      console.log(`🔥 Pre-warm: Making API call for request: ${requestId}`);
      
      const response = await fetch('/api/tts-with-timing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          voice_id: config.voiceId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || `API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    });
    
    const audioBytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });

    // Cache the result - this is the main purpose of this function
    await setAudioInCache(cacheKey, audioBlob, data.wordTimings || []);
    console.log(`🔥 Pre-warm: Audio cached successfully`);

  } catch (error) {
    console.warn('Pre-warm cache failed:', error);
    // Don't throw - pre-warming failures shouldn't break the app
  }
}

export function cleanupAudioUrl(audioUrl: string): void {
  if (audioUrl && audioUrl.startsWith('blob:')) {
    URL.revokeObjectURL(audioUrl);
  }
}

// Re-export the new IndexedDB cache functions
export async function clearTTSCache(): Promise<boolean> {
  return clearTTSCacheIndexedDB();
}

export async function getTTSCacheStats(): Promise<{ count: number; size: string; enabled: boolean }> {
  return getTTSCacheStatsIndexedDB();
}

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

export function estimateTextDuration(text: string, wordsPerMinute: number = 150): number {
  const wordCount = text.split(/\s+/).length;
  const baseDuration = (wordCount / wordsPerMinute) * 60;
  
  // Add duration for punctuation-based pauses
  const longPauses = (text.match(/[.!?]/g) || []).length * 0.6; // 600ms per sentence end
  const mediumPauses = (text.match(/[,;:]/g) || []).length * 0.3; // 300ms per clause break
  const paragraphBreaks = (text.match(/\n\s*\n/g) || []).length * 1.0; // 1s per paragraph break
  
  // Add breathing pauses for very long texts (every ~20 words without punctuation)
  const wordsWithoutMajorPauses = text.replace(/[.!?]/g, '').split(/\s+/).length;
  const breathingPauses = Math.floor(wordsWithoutMajorPauses / 20) * 0.4;
  
  const totalDuration = baseDuration + longPauses + mediumPauses + paragraphBreaks + breathingPauses;
  
  console.log('📊 Enhanced duration estimate:', {
    words: wordCount,
    baseDuration: baseDuration.toFixed(1),
    longPauses: longPauses.toFixed(1),
    mediumPauses: mediumPauses.toFixed(1),
    paragraphBreaks: paragraphBreaks.toFixed(1),
    breathingPauses: breathingPauses.toFixed(1),
    totalDuration: totalDuration.toFixed(1)
  });
  
  return Math.ceil(totalDuration);
}

export async function getAvailableVoices(): Promise<VoiceOption[]> {
  // Return the hardcoded Lemonfox voices
  return VOICE_OPTIONS;
}

export function getTTSQueueStatus() {
  return {
    queueLength: ttsQueue.getQueueLength(),
    isProcessing: ttsQueue.isQueueProcessing()
  };
}

export function clearTTSQueue() {
  ttsQueue.clearQueue();
}

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).getTTSQueueStatus = getTTSQueueStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).clearTTSQueue = clearTTSQueue;
  console.log('Dev Tools Available:');
  console.log('  - getTTSQueueStatus() - check queue status');
  console.log('  - clearTTSQueue() - clear pending requests');
} 
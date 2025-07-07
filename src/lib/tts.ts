/**
 * Text-to-Speech integration using ElevenLabs API
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

    return {
      audioUrl,
      audioBlob,
    };

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
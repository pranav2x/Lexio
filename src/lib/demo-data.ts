// This file contains pre-fetched, hardcoded data to ensure a flawless demo.
// Uses lazy decoding to prevent startup crashes with placeholder data.

// --- DATA STRUCTURES ---
export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface DemoAudioData {
  audioBlob: Blob;
  wordTimings: WordTiming[];
}

interface RawDemoData {
  audio_base64: string;
  wordTimings: WordTiming[];
}

// --- HELPER FUNCTION ---
function base64ToBlob(base64: string, contentType: string = 'audio/mpeg'): Blob {
  try {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  } catch (error) {
    console.error("Failed to decode Base64 string. Ensure it's valid.", { base64Preview: base64.substring(0, 50) + '...' });
    throw error;
  }
}

// --- HARDCODED RAW DATA (User needs to fill this) ---
// 
// INSTRUCTIONS FOR CAPTURING DATA:
// 1. Run the app and click the ▶️ play button on each content card
// 2. In DevTools Network tab, find the /api/tts-with-timing API call
// 3. Copy the audio_base64 string and wordTimings array from the JSON response
// 4. Paste them in the appropriate section below

const rawDemoData: Record<string, RawDemoData> = {
  'section-0': { // Trade Networks and Economic Development
    // PASTE HERE: From "Trade Networks and Economic Development" API response
    audio_base64: "PASTE_TRADE_NETWORKS_AUDIO_BASE64_HERE",
    wordTimings: [/* PASTE_TRADE_NETWORKS_TIMINGS_HERE */],
  },
  'section-3': { // Technological Innovation and Cultural Exchange
    // PASTE HERE: From "Technological Innovation and Cultural Exchange" API response
    audio_base64: "PASTE_TECH_INNOVATION_AUDIO_BASE64_HERE", 
    wordTimings: [/* PASTE_TECH_INNOVATION_TIMINGS_HERE */],
  },
  'summary': { // Summary
    // PASTE HERE: From "Summary" API response
    audio_base64: "PASTE_SUMMARY_AUDIO_BASE64_HERE",
    wordTimings: [/* PASTE_SUMMARY_TIMINGS_HERE */],
  },
};

// --- PUBLIC GETTER FUNCTION ---
export function getDemoData(id: string): DemoAudioData | null {
  const data = rawDemoData[id];

  if (!data) {
    return null; // Not a demo item
  }

  // Validation check: Ensure placeholders have been replaced
  if (data.audio_base64.startsWith('PASTE_')) {
    console.warn(`🎬 DEMO MODE WARNING: Audio data for "${id}" is missing. Please paste the real Base64 string into demo-data.ts.`);
    return null;
  }

  // Additional validation: Check for empty word timings
  if (!data.wordTimings || data.wordTimings.length === 0) {
    console.warn(`🎬 DEMO MODE WARNING: Word timings for "${id}" are missing. Please paste the real timings array into demo-data.ts.`);
    return null;
  }

  // Lazy decoding: Convert from Base64 to Blob only when requested
  try {
    return {
      audioBlob: base64ToBlob(data.audio_base64),
      wordTimings: data.wordTimings,
    };
  } catch (error) {
    console.error(`🎬 DEMO MODE ERROR: Failed to decode audio data for "${id}":`, error);
    return null;
  }
} 
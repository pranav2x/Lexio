import { WordTiming } from './tts';

const DB_NAME = 'LexioTTSCache';
const STORE_NAME = 'audioStore';
const DB_VERSION = 1;

interface CachedAudio {
  key: string;
  audioBlob: Blob;
  wordTimings: WordTiming[];
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(new Error('Failed to open IndexedDB.'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
  return dbPromise;
}

export async function getAudioFromCache(key: string): Promise<CachedAudio | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => {
        console.error('Failed to get from cache:', request.error);
        resolve(null);
      };
    });
  } catch (error) {
    console.error('Cache access error:', error);
    return null;
  }
}

export async function setAudioInCache(key: string, audioBlob: Blob, wordTimings: WordTiming[]): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const data: CachedAudio = {
      key,
      audioBlob,
      wordTimings,
      timestamp: Date.now(),
    };
    store.put(data);
  } catch (error) {
    console.error('Failed to write to cache:', error);
  }
}

export async function clearTTSCache(): Promise<boolean> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    console.log('TTS: IndexedDB cache cleared');
    return true;
  } catch (error) {
    console.error('Error clearing TTS cache:', error);
    return false;
  }
}

export async function getTTSCacheStats(): Promise<{ count: number; size: string; enabled: boolean }> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const countRequest = store.count();

    return new Promise((resolve) => {
      countRequest.onsuccess = () => {
        const count = countRequest.result;
        // Estimate size - IndexedDB doesn't provide direct size info
        const estimatedSizeKB = count * 50; // Rough estimate of 50KB per audio file
        resolve({
          count,
          size: `~${estimatedSizeKB} KB`,
          enabled: true
        });
      };
      countRequest.onerror = () => {
        resolve({ count: 0, size: '0 KB', enabled: false });
      };
    });
  } catch (error) {
    console.error('Error getting TTS cache stats:', error);
    return { count: 0, size: '0 KB', enabled: false };
  }
}

export function generateCacheKey(text: string, voiceId: string): string {
  // Create a simple hash of the text content and voice ID
  let hash = 0;
  const input = `${text.trim().toLowerCase()}-${voiceId}`;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
} 
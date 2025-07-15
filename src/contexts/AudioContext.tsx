"use client";

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { generateSpeech, cleanupAudioUrl, getTTSCacheStats } from '@/lib/tts';
import { useLexioState } from '@/lib/store';

interface WordData {
  word: string;
  index: number;
  startTime: number;
  endTime: number;
}

type PlayingSection = 'summary' | `section-${number}` | null;

interface AudioContextType {
  audioUrl: string | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isGeneratingAudio: boolean;
  audioError: string | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  hasSelectedSpeed: boolean;
  currentWordIndex: number;
  currentPlayingSection: PlayingSection;
  currentPlayingText: string;
  wordsData: WordData[];
  isMaximized: boolean;
  isTransitioning: boolean;
  isPreloading: boolean;
  cacheStats: any;
  generateAudioForSection: (sectionType: PlayingSection, customText?: string) => Promise<void>;
  handlePlayPause: () => void;
  handleStop: () => void;
  handleSeek: (newTime: number) => void;
  handleWordClick: (wordIndex: number) => void;
  handleSpeedChange: (newRate: number) => void;
  setIsMaximized: (maximized: boolean) => void;
  setIsPreloading: (preloading: boolean) => void;
  setCurrentPlayingSection: (section: PlayingSection) => void;
  setCurrentPlayingText: (text: string) => void;
  setCurrentWordIndex: (index: number) => void;
  setWordsData: (data: WordData[]) => void;
  setAudioUrl: (url: string | null) => void;
  clearAudio: () => void;
  handleClearCache: () => void;
  formatTime: (seconds: number) => string;
  findCurrentWordIndex: (currentTime: number) => number;
  generateWordTimings: (text: string, audioDuration: number) => WordData[];
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);
export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) throw new Error('useAudio must be used within an AudioProvider');
  return context;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedVoiceId } = useLexioState();

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasSelectedSpeed, setHasSelectedSpeed] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [currentPlayingSection, setCurrentPlayingSection] = useState<PlayingSection>(null);
  const [currentPlayingText, setCurrentPlayingText] = useState('');
  
  // Debug: Track when currentPlayingText changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 AudioContext: currentPlayingText changed, length:', currentPlayingText.length);
    }
  }, [currentPlayingText]);
  
  // Debug: Create a wrapped setCurrentPlayingText to track calls
  const wrappedSetCurrentPlayingText = useCallback((text: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 setCurrentPlayingText called, length:', text.length);
    }
    setCurrentPlayingText(text);
  }, []);
  const [wordsData, setWordsData] = useState<WordData[]>([]);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  const findCurrentWordIndex = useCallback((time: number): number => {
    if (!wordsData.length) return -1;
    
    // Find the word that should be highlighted at the current time
    // We'll highlight a word if we're within its timing window
    for (let i = 0; i < wordsData.length; i++) {
      const word = wordsData[i];
      // Give a small buffer (0.1s) to make highlighting feel more natural
      if (time >= word.startTime - 0.1 && time <= word.endTime + 0.1) {
        return i;
      }
    }
    
    // If no exact match, find the closest word
    // This handles cases where timing might be slightly off
    let closestIndex = -1;
    let closestDistance = Infinity;
    
    for (let i = 0; i < wordsData.length; i++) {
      const word = wordsData[i];
      const wordMidpoint = (word.startTime + word.endTime) / 2;
      const distance = Math.abs(time - wordMidpoint);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }
    
    // Only return the closest word if it's within a reasonable range (2 seconds)
    return closestDistance < 2 ? closestIndex : -1;
  }, [wordsData]);

  const generateAudioForSection = useCallback(async (sectionType: PlayingSection, customText?: string) => {
    if (!sectionType) return;
    setIsGeneratingAudio(true);
    setAudioError(null);
    setCurrentPlayingSection(sectionType);
    try {
      const textToSpeak = customText || '';
      setCurrentPlayingText(textToSpeak);
      const result = await generateSpeech(textToSpeak, {}, selectedVoiceId);
      setAudioUrl(result.audioUrl);
      setWordsData([]); // Word timings will be generated when audio loads
      if (process.env.NODE_ENV === 'development') setCacheStats(getTTSCacheStats());
    } catch (err) {
      console.error('generateAudioForSection error:', err);
      setAudioError('Failed to generate audio.');
      setCurrentPlayingSection(null);
      setCurrentPlayingText('');
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [selectedVoiceId]);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;
    isPlaying ? audioRef.current.pause() : audioRef.current.play().catch(console.debug);
  }, [audioUrl, isPlaying]);

  const handleStop = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setCurrentWordIndex(-1);
    setCurrentPlayingSection(null);
    setCurrentPlayingText('');
    if (audioUrl) cleanupAudioUrl(audioUrl);
    setAudioUrl(null);
  }, [audioUrl]);

  const handleSeek = useCallback((newTime: number) => {
    if (audioRef.current) audioRef.current.currentTime = newTime;
  }, []);

  const handleWordClick = useCallback((index: number) => {
    const word = wordsData[index];
    if (!word || !audioRef.current) return;
    audioRef.current.currentTime = word.startTime;
    setCurrentWordIndex(index);
  }, [wordsData]);

  const handleSpeedChange = useCallback((rate: number) => {
    if (!audioRef.current) return;
    setPlaybackRate(rate);
    setHasSelectedSpeed(true);
    audioRef.current.playbackRate = rate;
  }, []);

  const clearAudio = useCallback(() => {
    console.log('🧹 clearAudio called - this will clear currentPlayingText!');
    
    if (audioRef.current) audioRef.current.pause();
    if (audioUrl) cleanupAudioUrl(audioUrl);
    setAudioUrl(null);
    setCurrentPlayingSection(null);
    setCurrentPlayingText('');
    setCurrentWordIndex(-1);
    setWordsData([]);
    setIsPlaying(false);
  }, [audioUrl]);

  const handleClearCache = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      import('@/lib/tts').then(({ clearTTSCache }) => {
        if (clearTTSCache()) setCacheStats(getTTSCacheStats());
      });
    }
  }, []);

  const formatTime = useCallback((s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`, []);

  const generateWordTimings = useCallback((text: string, audioDuration: number): WordData[] => {
    const words = text.split(/(\s+)/);
    const nonWhitespaceWords = words.filter(word => word.trim() !== '');
    if (nonWhitespaceWords.length === 0) return [];
    
    console.log('🔤 Generating word timings for', nonWhitespaceWords.length, 'words, duration:', audioDuration.toFixed(2) + 's');
    
    // More realistic timing calculation
    const totalSpeechTime = audioDuration * 0.92; // Leave 8% for start/end silence
    const wordsPerMinute = 160; // Average TTS speaking rate
    const baseWordsPerSecond = wordsPerMinute / 60;
    const expectedDuration = nonWhitespaceWords.length / baseWordsPerSecond;
    
    // Scale factor to match actual audio duration
    const scaleFactor = totalSpeechTime / expectedDuration;
    
    let currentTime = audioDuration * 0.04; // Start after 4% of audio
    const wordTimings: WordData[] = [];
    
    words.forEach((word, index) => {
      if (word.trim() === '') {
        // Whitespace - minimal pause
        const pauseDuration = 0.05 * scaleFactor;
        wordTimings.push({
          word,
          index,
          startTime: currentTime,
          endTime: currentTime + pauseDuration,
        });
        currentTime += pauseDuration;
      } else {
        // Calculate word duration based on length and complexity
        let baseWordDuration = 0.4; // Base duration in seconds
        
        // Adjust for word length
        const lengthFactor = Math.max(0.5, Math.min(2.0, word.length / 5));
        baseWordDuration *= lengthFactor;
        
        // Adjust for word complexity (numbers, capitalization, etc.)
        if (/^\d+$/.test(word)) baseWordDuration *= 1.3; // Numbers take longer
        if (/^[A-Z]{2,}$/.test(word)) baseWordDuration *= 1.2; // Acronyms
        if (word.length > 10) baseWordDuration *= 1.1; // Long words
        
        const wordDuration = baseWordDuration * scaleFactor;
        
        // Calculate pause after word based on punctuation
        let pauseAfter = 0.08 * scaleFactor; // Default small pause
        if (/[.!?]$/.test(word)) {
          pauseAfter = 0.5 * scaleFactor; // Sentence end
        } else if (/[,;:]$/.test(word)) {
          pauseAfter = 0.25 * scaleFactor; // Clause end
        } else if (/[-—]$/.test(word)) {
          pauseAfter = 0.2 * scaleFactor; // Dash
        }
        
        wordTimings.push({
          word,
          index,
          startTime: currentTime,
          endTime: currentTime + wordDuration,
        });
        
        currentTime += wordDuration + pauseAfter;
      }
    });
    
    // Final adjustment to ensure we don't exceed audio duration
    const totalCalculatedTime = currentTime;
    if (totalCalculatedTime > audioDuration) {
      const compressionFactor = (audioDuration * 0.98) / totalCalculatedTime;
      wordTimings.forEach(timing => {
        timing.startTime *= compressionFactor;
        timing.endTime *= compressionFactor;
      });
    }
    
    console.log('✅ Generated', wordTimings.length, 'word timings');
    
    return wordTimings;
  }, []);

  useEffect(() => {
    if (!isPlaying || !wordsData.length) return;
    
    console.log('🔄 Starting word highlighting updates for', wordsData.length, 'words');
    
    const interval = setInterval(() => {
      const time = audioRef.current?.currentTime || 0;
      const idx = findCurrentWordIndex(time);
      
      if (idx !== currentWordIndex) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🎯 Word highlight changed:', {
            time: time.toFixed(2),
            newIndex: idx,
            word: idx >= 0 ? wordsData[idx]?.word : 'NONE'
          });
        }
        setCurrentWordIndex(idx);
      }
    }, 50); // Update every 50ms for smooth highlighting
    
    return () => {
      console.log('🛑 Stopping word highlighting updates');
      clearInterval(interval);
    };
  }, [isPlaying, wordsData, findCurrentWordIndex, currentWordIndex]);

  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;
    const audio = audioRef.current;
    const setDur = () => {
      setDuration(audio.duration);
      // Generate word timings when we have both duration and text
      if (audio.duration && currentPlayingText) {
        const timings = generateWordTimings(currentPlayingText, audio.duration);
        setWordsData(timings);
      }
    };
    const syncTime = () => setCurrentTime(audio.currentTime);
    audio.addEventListener('loadedmetadata', setDur);
    audio.addEventListener('timeupdate', syncTime);
    return () => {
      audio.removeEventListener('loadedmetadata', setDur);
      audio.removeEventListener('timeupdate', syncTime);
    };
  }, [audioUrl, currentPlayingText, generateWordTimings]);

  return (
    <AudioContext.Provider value={{
      audioUrl,
      audioRef,
      isGeneratingAudio,
      audioError,
      duration,
      currentTime,
      isPlaying,
      playbackRate,
      hasSelectedSpeed,
      currentWordIndex,
      currentPlayingSection,
      currentPlayingText,
      wordsData,
      isMaximized,
      isTransitioning,
      isPreloading,
      cacheStats,
      generateAudioForSection,
      handlePlayPause,
      handleStop,
      handleSeek,
      handleWordClick,
      handleSpeedChange,
      setIsMaximized,
      setIsPreloading,
      setCurrentPlayingSection,
      setCurrentPlayingText: wrappedSetCurrentPlayingText,
      setCurrentWordIndex,
      setWordsData,
      setAudioUrl,
      clearAudio,
      handleClearCache,
      formatTime,
      findCurrentWordIndex,
      generateWordTimings,
    }}>
      {children}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      )}
    </AudioContext.Provider>
  );
};

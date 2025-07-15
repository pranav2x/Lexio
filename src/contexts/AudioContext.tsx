"use client";

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { generateSpeech, cleanupAudioUrl, estimateTextDuration, getTTSCacheStats } from '@/lib/tts';
import { useLexioState } from '@/lib/store';

interface WordData {
  word: string;
  index: number;
  startTime: number;
  endTime: number;
  isWhitespace: boolean;
}

type PlayingSection = 'summary' | `section-${number}` | null;

interface AudioContextType {
  // Audio state
  audioUrl: string | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isGeneratingAudio: boolean;
  audioError: string | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  hasSelectedSpeed: boolean;
  
  // Word highlighting
  currentWordIndex: number;
  currentPlayingSection: PlayingSection;
  currentPlayingText: string;
  wordsData: WordData[];
  
  // Maximized player
  isMaximized: boolean;
  isTransitioning: boolean;
  isPreloading: boolean;
  
  // Development cache
  cacheStats: any;
  
  // Actions
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
  
  // Helper functions
  formatTime: (seconds: number) => string;
  generateWordTimings: (text: string, audioDuration: number) => WordData[];
  findCurrentWordIndex: (currentTime: number) => number;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: React.ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const { selectedVoiceId } = useLexioState();
  
  // Audio state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasSelectedSpeed, setHasSelectedSpeed] = useState(false);
  
  // Word highlighting
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [currentPlayingSection, setCurrentPlayingSection] = useState<PlayingSection>(null);
  const [currentPlayingText, setCurrentPlayingText] = useState('');
  const [wordsData, setWordsData] = useState<WordData[]>([]);
  
  // Maximized player
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  
  // Development cache
  const [cacheStats, setCacheStats] = useState<any>(null);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Enhanced word timing generation for better TTS synchronization
  const generateWordTimings = useCallback((text: string, audioDuration: number): WordData[] => {
    const words = text.split(/(\s+)/);
    const nonWhitespaceWords = words.filter(word => word.trim() !== '');
    
    if (nonWhitespaceWords.length === 0) return [];
    
    // More realistic speech timing
    const totalSpeechTime = audioDuration * 0.95; // Leave 5% buffer
    const averageWordDuration = totalSpeechTime / nonWhitespaceWords.length;
    
    let currentTime = 0.1; // Small initial delay
    const wordTimings: WordData[] = [];
    
    words.forEach((word, index) => {
      const isWhitespace = word.trim() === '';
      
      if (isWhitespace) {
        // Very short whitespace duration
        const pauseDuration = 0.02;
        wordTimings.push({
          word,
          index,
          startTime: currentTime,
          endTime: currentTime + pauseDuration,
          isWhitespace: true,
        });
        currentTime += pauseDuration;
      } else {
        // Dynamic word duration based on length and complexity
        let wordDuration = averageWordDuration;
        
        // Adjust for word length (longer words take more time)
        const lengthFactor = Math.max(0.7, Math.min(1.5, word.length / 6));
        wordDuration *= lengthFactor;
        
        // Adjust for complexity (syllables, punctuation)
        if (/[.!?]$/.test(word)) wordDuration *= 1.1; // Slight emphasis for sentence endings
        if (/[,;:]$/.test(word)) wordDuration *= 1.05; // Slight pause for punctuation
        
        // Natural pause after word based on punctuation
        let pauseAfter = 0;
        if (/[.!?]$/.test(word)) pauseAfter = averageWordDuration * 0.3;
        else if (/[,;:]$/.test(word)) pauseAfter = averageWordDuration * 0.15;
        else pauseAfter = averageWordDuration * 0.05; // Small natural pause
        
        wordTimings.push({
          word,
          index,
          startTime: currentTime,
          endTime: currentTime + wordDuration,
          isWhitespace: false,
        });
        
        currentTime += wordDuration + pauseAfter;
      }
    });
    
    // Scale to fit actual audio duration
    const totalCalculatedTime = currentTime;
    const scaleFactor = (audioDuration - 0.1) / (totalCalculatedTime - 0.1);
    
    wordTimings.forEach(timing => {
      timing.startTime = 0.1 + (timing.startTime - 0.1) * scaleFactor;
      timing.endTime = 0.1 + (timing.endTime - 0.1) * scaleFactor;
    });
    
    return wordTimings;
  }, []);

  // Accurate time-based word finding
  const findCurrentWordIndex = useCallback((currentTime: number): number => {
    if (wordsData.length === 0 || currentTime < 0) return -1;
    
    // Find the closest word that should be highlighted at this time
    // More forgiving approach - find the word we should be at or just passed
    let bestIndex = -1;
    
    for (let i = 0; i < wordsData.length; i++) {
      const word = wordsData[i];
      if (word.isWhitespace) continue;
      
      // If current time is within the word's time window
      if (currentTime >= word.startTime && currentTime <= word.endTime) {
        return i;
      }
      
      // If current time is past this word's start time, this is a candidate
      if (currentTime >= word.startTime) {
        bestIndex = i;
      }
    }
    
    return bestIndex;
  }, [wordsData]);

  // Generate audio for a section
  const generateAudioForSection = useCallback(async (sectionType: PlayingSection, customText?: string) => {
    if (!sectionType) return;

    setIsGeneratingAudio(true);
    setAudioError(null);
    setCurrentPlayingSection(sectionType);

    try {
      let textToSpeak = customText || '';
      setCurrentPlayingText(textToSpeak);
      
      const result = await generateSpeech(textToSpeak, {}, selectedVoiceId);
      setAudioUrl(result.audioUrl);
      
      if (process.env.NODE_ENV === 'development') {
        setCacheStats(getTTSCacheStats());
      }
    } catch (error) {
      console.error('Failed to generate audio:', error);
      setAudioError(error instanceof Error ? error.message : 'Failed to generate audio');
      setCurrentPlayingSection(null);
      setCurrentPlayingText('');
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [selectedVoiceId]);

  // Play/pause control
  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      try {
        audioRef.current.play();
      } catch (playError) {
        console.debug('Play interrupted:', playError);
      }
    }
  }, [audioUrl, isPlaying]);

  // Stop audio
  const handleStop = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setCurrentWordIndex(-1);
    setCurrentPlayingSection(null);
    setCurrentPlayingText('');
    // setIsMaximized(false); // Don't reset maximized state here; let UI layer control collapse
    
    if (audioUrl) {
      cleanupAudioUrl(audioUrl);
      setAudioUrl(null);
    }
  }, [audioUrl]);

  // Seek to position
  const handleSeek = useCallback((newTime: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = newTime;
  }, []);

  // Handle word click
  const handleWordClick = useCallback((wordIndex: number) => {
    if (!audioRef.current || wordIndex >= wordsData.length) return;
    
    const wordData = wordsData[wordIndex];
    if (!wordData.isWhitespace) {
      audioRef.current.currentTime = wordData.startTime;
      setCurrentWordIndex(wordIndex);
    }
  }, [wordsData]);

  // Handle playback speed change
  const handleSpeedChange = useCallback((newRate: number) => {
    if (!audioRef.current) return;
    
    setPlaybackRate(newRate);
    setHasSelectedSpeed(true);
    audioRef.current.playbackRate = newRate;
  }, []);

  // Clear audio
  const clearAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (audioUrl) {
      cleanupAudioUrl(audioUrl);
      setAudioUrl(null);
    }
    setCurrentPlayingSection(null);
    setCurrentPlayingText('');
    setCurrentWordIndex(-1);
    setWordsData([]);
    setIsPlaying(false);
    // setIsMaximized(false); // preserve UI zoom state
  }, [audioUrl]);

  // Handle cache clearing
  const handleClearCache = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      // Import clearTTSCache dynamically to avoid issues
      import('@/lib/tts').then(({ clearTTSCache }) => {
        if (clearTTSCache()) {
          setCacheStats(getTTSCacheStats());
        }
      });
    }
  }, []);

  // Format time utility
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Generate word timings when audio loads
  useEffect(() => {
    if (audioRef.current && duration > 0 && currentPlayingText) {
      const timings = generateWordTimings(currentPlayingText, duration);
      setWordsData(timings);
    }
  }, [duration, currentPlayingText, generateWordTimings]);

  // Set playback rate when audio loads
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      try {
        if (audioRef.current.readyState >= 1) {
          audioRef.current.playbackRate = playbackRate;
        } else {
          const handleCanPlay = () => {
            if (audioRef.current) {
              audioRef.current.playbackRate = playbackRate;
            }
          };
          audioRef.current.addEventListener('canplay', handleCanPlay, { once: true });
          return () => {
            if (audioRef.current) {
              audioRef.current.removeEventListener('canplay', handleCanPlay);
            }
          };
        }
      } catch (error) {
        console.debug('Playback rate setting skipped:', error);
      }
    }
  }, [audioUrl, playbackRate]);

  // Real-time TTS-synced word index updates (30ms intervals)
  useEffect(() => {
    console.log('🔤 Word highlighting useEffect:', { isPlaying, wordsDataLength: wordsData.length, currentWordIndex });
    if (isPlaying && wordsData.length > 0) {
      console.log('🔤 Starting word highlighting interval - wordsData length:', wordsData.length);
      const interval = setInterval(() => {
        const currentAudioTime = audioRef.current?.currentTime || 0;
        const newWordIndex = findCurrentWordIndex(currentAudioTime);
        
        // Update word index if it changed (including -1 to handle gaps)
        if (newWordIndex !== currentWordIndex) {
          console.log(`🔤 Word index changed: ${currentWordIndex} -> ${newWordIndex} at ${currentAudioTime.toFixed(2)}s`);
          setCurrentWordIndex(newWordIndex);
          
          // Debug logging for word highlighting
          if (process.env.NODE_ENV === 'development' && newWordIndex >= 0 && wordsData[newWordIndex]) {
            console.log(`🔤 Word highlight: "${wordsData[newWordIndex].word}" (${newWordIndex}/${wordsData.length}) at ${currentAudioTime.toFixed(2)}s`);
          }
        }
      }, 30); // Update every 30ms for smoother highlighting
      
      return () => clearInterval(interval);
    } else if (!isPlaying) {
      // Reset word index when not playing
      // setCurrentWordIndex(-1);
    }
  }, [isPlaying, wordsData, findCurrentWordIndex, currentWordIndex, audioRef]);

  // Update cache stats in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const updateCacheStats = () => {
        const stats = getTTSCacheStats();
        setCacheStats(stats);
      };
      
      updateCacheStats();
      
      const interval = setInterval(updateCacheStats, 2000);
      return () => clearInterval(interval);
    }
  }, []);

  const value: AudioContextType = {
    // Audio state
    audioUrl,
    audioRef,
    isGeneratingAudio,
    audioError,
    duration,
    currentTime,
    isPlaying,
    playbackRate,
    hasSelectedSpeed,
    
    // Word highlighting
    currentWordIndex,
    currentPlayingSection,
    currentPlayingText,
    wordsData,
    
    // Maximized player
    isMaximized,
    isTransitioning,
    isPreloading,
    
    // Development cache
    cacheStats,
    
    // Actions
    generateAudioForSection,
    handlePlayPause,
    handleStop,
    handleSeek,
    handleWordClick,
    handleSpeedChange,
    setIsMaximized,
    setIsPreloading,
    setCurrentPlayingSection,
    setCurrentPlayingText,
    setCurrentWordIndex,
    setWordsData,
    setAudioUrl,
    clearAudio,
    handleClearCache,
    
    // Helper functions
    formatTime,
    generateWordTimings,
    findCurrentWordIndex,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
      
      {/* Hidden Audio Element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
              try {
                audioRef.current.playbackRate = playbackRate;
              } catch (error) {
                console.debug('Playback rate setting skipped during load:', error);
              }
            }
          }}
          onLoadedData={() => {
            if (audioRef.current && audioRef.current.duration > 0 && !isNaN(audioRef.current.duration)) {
              console.log('🎵 Audio: onLoadedData - duration:', audioRef.current.duration);
              if (currentPlayingText) {
                console.log('🎵 Audio: Generating word timings for text length:', currentPlayingText.length);
                const actualTimings = generateWordTimings(currentPlayingText, audioRef.current.duration);
                console.log('🎵 Audio: Generated', actualTimings.length, 'word timings');
                setWordsData(actualTimings);
              } else {
                console.log('🎵 Audio: No currentPlayingText available for word timings');
              }
            }
          }}
          onCanPlay={() => {
            if (audioRef.current) {
              try {
                audioRef.current.playbackRate = playbackRate;
              } catch (error) {
                console.debug('Playback rate setting skipped during canplay:', error);
              }
            }
          }}
          onPlay={() => {
            console.log('🎵 Audio: onPlay event - wordsData length:', wordsData.length);
            setIsPlaying(true);
            if (currentWordIndex === -1 && wordsData.length > 0) {
              console.log('🎵 Audio: Setting initial word index to 0');
              setCurrentWordIndex(0);
            }
          }}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={() => {
            if (audioRef.current && !isNaN(audioRef.current.currentTime)) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          preload="auto"
        />
      )}
    </AudioContext.Provider>
  );
}; 
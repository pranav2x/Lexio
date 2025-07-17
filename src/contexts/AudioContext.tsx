"use client";

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { useLexioState } from '@/lib/store';

export interface WordData {
  text: string;
  start: number;
  end: number;
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
  words: WordData[];
  isMaximized: boolean;
  isTransitioning: boolean;
  isPreloading: boolean;
  generateAudioForSection: (sectionType: PlayingSection, customText?: string) => Promise<void>;
  playSectionDirectly: (sectionId: string, content: string) => Promise<void>;
  playQueueItem: (item: any) => Promise<void>;
  handlePlayPause: () => void;
  handleStop: () => void;
  handleSeek: (newTime: number) => void;
  handleWordClick: (wordIndex: number) => void;
  handleSpeedChange: (newRate: number) => void;
  setIsMaximized: (maximized: boolean) => void;
  setIsPreloading: (preloading: boolean) => void;
  setCurrentPlayingSection: (section: PlayingSection) => void;
  setCurrentPlayingText: (text: string) => void;
  setWords: (words: WordData[]) => void;
  setAudioUrl: (url: string | null) => void;
  clearAudio: () => void;
  formatTime: (seconds: number) => string;
  onQueueItemComplete?: () => void;
  setOnQueueItemComplete: (callback: (() => void) | undefined) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) throw new Error('useAudio must be used within an AudioProvider');
  return context;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { scrapedData } = useLexioState();

  // Web Speech API states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasSelectedSpeed, setHasSelectedSpeed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [words, setWords] = useState<WordData[]>([]);
  const [currentPlayingSection, setCurrentPlayingSection] = useState<PlayingSection>(null);
  const [currentPlayingText, setCurrentPlayingText] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [timeOffset, setTimeOffset] = useState(0);
  const [onQueueItemComplete, setOnQueueItemComplete] = useState<(() => void) | undefined>(undefined);

  // Web Speech API refs
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startTimeRef = useRef(0);
  const pausedTimeRef = useRef(0);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const actualStartTimeRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null); // Keep for compatibility
  const speechBusyRef = useRef(false); // Prevent multiple simultaneous speech calls
  const justStartedRef = useRef(false); // Prevent premature completion callbacks

  // Generate word timings based on text analysis (similar to WebSpeechReader)
  const generateWordTimings = useCallback((text: string, speed: number): WordData[] => {
    const textWords = text.split(' ');
    const baseWPM = 160;
    const adjustedWPM = baseWPM * speed;
    const charsPerSecond = (adjustedWPM * 5) / 60;
    
    let currentTime = 0;
    const timings = textWords.map((word) => {
      const wordComplexity = word.length > 6 ? 1.2 : word.length < 3 ? 0.8 : 1;
      const baseDuration = (word.length + 1) / charsPerSecond;
      const wordDuration = baseDuration * wordComplexity;
      
      const timing = {
        text: word,
        start: currentTime,
        end: currentTime + wordDuration
      };
      currentTime += wordDuration;
      return timing;
    });
    
    return timings;
  }, []);

  // Update current word based on elapsed time
  const updateCurrentWord = useCallback(() => {
    if (words.length > 0 && isPlaying && !isPaused) {
      const now = Date.now();
      const elapsedTime = (now - actualStartTimeRef.current) / 1000;
      const adjustedTime = elapsedTime + timeOffset;
      
      setCurrentTime(adjustedTime);
      
      const currentWordIdx = words.findIndex(timing => 
        adjustedTime >= (timing.start - 0.1) && adjustedTime < (timing.end + 0.1)
      );
      
      if (currentWordIdx !== -1 && currentWordIdx !== currentWordIndex) {
        setCurrentWordIndex(currentWordIdx);
      }
      
      if (adjustedTime >= duration && !justStartedRef.current) {
        handleStop();
        // Call queue completion callback if it exists
        if (onQueueItemComplete) {
          onQueueItemComplete();
        }
      }
    }
  }, [words, isPlaying, isPaused, currentWordIndex, duration, timeOffset, onQueueItemComplete]);

  // Set up interval for updating current word
  useEffect(() => {
    if (isPlaying && !isPaused) {
      timeUpdateInterval.current = setInterval(updateCurrentWord, 100);
    } else {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    }

    return () => {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    };
  }, [isPlaying, isPaused, updateCurrentWord]);

  const handleStop = useCallback(() => {
    speechSynthesis.cancel();
    speechBusyRef.current = false; // Clear busy flag when stopping
    justStartedRef.current = false; // Clear flag when stopping
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentWordIndex(-1);
    setCurrentTime(0);
    startTimeRef.current = 0;
    actualStartTimeRef.current = 0;
    pausedTimeRef.current = 0;
    setTimeOffset(0);
  }, []);

  const generateAudioForSection = useCallback(async (sectionType: PlayingSection, customText?: string) => {
    if (!scrapedData && !customText) return;

    setIsGeneratingAudio(true);
    setAudioError(null);
    
    try {
      let textToSpeak = customText || '';
      
      if (!customText) {
        if (sectionType === 'summary') {
          // Extract summary logic would go here
          textToSpeak = scrapedData?.cleanText?.substring(0, 1000) || scrapedData?.text?.substring(0, 1000) || '';
        } else if (sectionType?.startsWith('section-')) {
          const sectionIndex = parseInt(sectionType.split('-')[1]);
          textToSpeak = scrapedData?.sections[sectionIndex]?.content || '';
        }
      }

      // Generate word timings
      const wordTimings = generateWordTimings(textToSpeak, playbackRate);
      setWords(wordTimings);
      setDuration(wordTimings[wordTimings.length - 1]?.end || 0);
      setCurrentPlayingText(textToSpeak);
      setCurrentPlayingSection(sectionType);

    } catch (error) {
      setAudioError(`Failed to prepare audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [scrapedData, playbackRate, generateWordTimings]);

  // New function to play queue items
  const playQueueItem = useCallback(async (item: any) => {
    if (!item || !item.content) return;

    // Prevent multiple simultaneous calls
    if (speechBusyRef.current) {
      console.log('⚠️ Speech system busy, skipping request for:', item.title);
      return;
    }

    console.log('🎵 Playing queue item:', item.title);
    speechBusyRef.current = true;
    
    try {
      // CRITICAL: Stop any existing speech synthesis FIRST and wait for it to clear
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        // Give it more time to fully cancel and clear
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Wait for speech synthesis to be ready
      let attempts = 0;
      while (speechSynthesis.speaking && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      // Clear all current audio state and reset timing
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentWordIndex(-1);
      setCurrentTime(0);
      setTimeOffset(0);
      startTimeRef.current = 0;
      actualStartTimeRef.current = 0;
      pausedTimeRef.current = 0;
      justStartedRef.current = true; // Prevent premature completion
      
      // Clear any error states
      setAudioError(null);
      
      // Set the current playing text and section for queue items
      const wordTimings = generateWordTimings(item.content, playbackRate);
      setWords(wordTimings);
      setDuration(wordTimings[wordTimings.length - 1]?.end || 0);
      setCurrentPlayingText(item.content);
      setCurrentPlayingSection(item.id); // Use item ID as the section identifier
      
      // Start Web Speech API with proper error handling
      const utterance = new SpeechSynthesisUtterance(item.content);
      utterance.rate = playbackRate;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Alex') || 
        voice.name.includes('Daniel') || 
        voice.name.includes('Samantha') ||
        voice.lang.includes('en')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.onstart = () => {
        const now = Date.now();
        startTimeRef.current = now;
        actualStartTimeRef.current = now;
        pausedTimeRef.current = 0;
        setIsPlaying(true);
        setIsPaused(false);
        console.log('🎵 Started playing:', item.title);
        
        // Clear the justStarted flag after a brief delay to allow proper initialization
        setTimeout(() => {
          justStartedRef.current = false;
        }, 500);
      };
      
      utterance.onend = () => {
        console.log('✅ Finished playing:', item.title);
        speechBusyRef.current = false;
        justStartedRef.current = false; // Clear flag when naturally ending
        handleStop();
        // Call queue completion callback if it exists
        if (onQueueItemComplete) {
          onQueueItemComplete();
        }
      };
      
      utterance.onerror = (event) => {
        speechBusyRef.current = false;
        justStartedRef.current = false; // Clear flag on error
        
        // Only log and set error for serious errors, not normal interruptions
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          console.error('❌ Speech error for', item.title, ':', event.error);
          setAudioError(`Speech error: ${event.error}`);
        } else {
          console.log('🔇 Speech interrupted/canceled for', item.title, '(normal pause behavior)');
        }
        setIsPlaying(false);
      };
      
      utteranceRef.current = utterance;
      
      // Final check before speaking
      if (!speechSynthesis.speaking) {
        speechSynthesis.speak(utterance);
      } else {
        console.warn('⚠️ Speech synthesis still busy after waiting, cannot start');
        speechBusyRef.current = false;
        setAudioError('Audio system busy, please try again');
      }
      
    } catch (error) {
      speechBusyRef.current = false;
      setAudioError(`Failed to start speech: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [generateAudioForSection, playbackRate, onQueueItemComplete, handleStop]);

  const playSectionDirectly = useCallback(async (sectionId: string, content: string) => {
    await generateAudioForSection(sectionId as PlayingSection, content);
    
    // Start Web Speech API
    try {
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.rate = playbackRate;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Alex') || 
        voice.name.includes('Daniel') || 
        voice.name.includes('Samantha') ||
        voice.lang.includes('en')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.onstart = () => {
        const now = Date.now();
        startTimeRef.current = now;
        actualStartTimeRef.current = now;
        pausedTimeRef.current = 0;
        setIsPlaying(true);
        setIsPaused(false);
      };
      
      utterance.onend = () => {
        handleStop();
      };
      
      utterance.onerror = (event) => {
        // Only set error for serious errors, not normal interruptions
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          setAudioError(`Speech error: ${event.error}`);
        }
        setIsPlaying(false);
      };
      
      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
      
    } catch (error) {
      setAudioError(`Failed to start speech: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [generateAudioForSection, playbackRate]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      // Pause
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        setIsPaused(true);
        setIsPlaying(false);
        pausedTimeRef.current = Date.now();
        console.log('⏸️ Paused at time:', currentTime, 'word index:', currentWordIndex);
      }
    } else if (isPaused) {
      // Resume from current position with improved precision
      if (currentPlayingText && words.length > 0) {
        try {
          speechSynthesis.cancel();
          
          const currentTimeInSeconds = currentTime;
          let startWordIndex = Math.max(0, currentWordIndex);
          
          // If we're in the middle of a word, calculate how much of it we've already "spoken"
          const currentWord = words[startWordIndex];
          let wordProgressRatio = 0;
          
          if (currentWord) {
            const wordProgress = currentTimeInSeconds - currentWord.start;
            const wordDuration = currentWord.end - currentWord.start;
            wordProgressRatio = Math.max(0, Math.min(1, wordProgress / wordDuration));
            
            // If we're more than halfway through the current word, start from the next word
            if (wordProgressRatio > 0.5 && startWordIndex < words.length - 1) {
              startWordIndex += 1;
              console.log('📍 Resuming from next word due to progress ratio:', wordProgressRatio);
            }
          }
          
          // Create text starting from the calculated position
          const textWords = currentPlayingText.split(' ');
          const remainingWords = textWords.slice(startWordIndex);
          const remainingText = remainingWords.join(' ');
          
          console.log('▶️ Resuming from word index:', startWordIndex, 'time:', currentTimeInSeconds);
          
          if (remainingText.trim()) {
            const utterance = new SpeechSynthesisUtterance(remainingText);
            utterance.rate = playbackRate;
            utterance.pitch = 1;
            utterance.volume = 1;
            
            const voices = speechSynthesis.getVoices();
            const preferredVoice = voices.find(voice => 
              voice.name.includes('Alex') || 
              voice.name.includes('Daniel') || 
              voice.name.includes('Samantha') ||
              voice.lang.includes('en')
            );
            if (preferredVoice) {
              utterance.voice = preferredVoice;
            }
            
            utterance.onstart = () => {
              const now = Date.now();
              
              // Calculate the time offset to align with where we should be
              const targetStartTime = words[startWordIndex]?.start || currentTimeInSeconds;
              actualStartTimeRef.current = now - (targetStartTime * 1000);
              startTimeRef.current = actualStartTimeRef.current;
              
              // Update our tracking to the new starting word
              setCurrentWordIndex(startWordIndex);
              setCurrentTime(targetStartTime);
              
              setIsPlaying(true);
              setIsPaused(false);
              pausedTimeRef.current = 0;
              
              console.log('✅ Resumed playback from time:', targetStartTime);
            };
            
            utterance.onend = () => {
              handleStop();
              if (onQueueItemComplete) {
                onQueueItemComplete();
              }
            };
            
            utterance.onerror = (event) => {
              if (event.error !== 'interrupted' && event.error !== 'canceled') {
                setAudioError(`Speech error: ${event.error}`);
              }
              setIsPlaying(false);
            };
            
            utteranceRef.current = utterance;
            speechSynthesis.speak(utterance);
          } else {
            setIsPaused(false);
          }
          
        } catch (error) {
          setAudioError(`Failed to resume speech: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setIsPaused(false);
        }
      }
    } else {
      // Start playing current section or queue item
      if (currentPlayingText) {
        playSectionDirectly(currentPlayingSection || 'unknown', currentPlayingText);
      }
    }
  }, [isPlaying, isPaused, currentPlayingText, currentPlayingSection, currentTime, currentWordIndex, words, playbackRate, onQueueItemComplete, handleStop, playSectionDirectly]);

  const handleSeek = useCallback((newTime: number) => {
    if (words.length > 0) {
      const newWordIndex = words.findIndex(timing => 
        newTime >= timing.start && newTime < timing.end
      );
      
      if (newWordIndex !== -1) {
        setCurrentWordIndex(newWordIndex);
        setCurrentTime(newTime);
        actualStartTimeRef.current = Date.now() - (newTime * 1000);
        startTimeRef.current = actualStartTimeRef.current;
        
        console.log('🎯 Seeked to time:', newTime, 'word index:', newWordIndex);
        
        // If we're currently playing, restart speech from the new position
        if (isPlaying && currentPlayingText) {
          speechSynthesis.cancel();
          
          const textWords = currentPlayingText.split(' ');
          const remainingWords = textWords.slice(newWordIndex);
          const remainingText = remainingWords.join(' ');
          
          if (remainingText.trim()) {
            const utterance = new SpeechSynthesisUtterance(remainingText);
            utterance.rate = playbackRate;
            utterance.pitch = 1;
            utterance.volume = 1;
            
            const voices = speechSynthesis.getVoices();
            const preferredVoice = voices.find(voice => 
              voice.name.includes('Alex') || 
              voice.name.includes('Daniel') || 
              voice.name.includes('Samantha') ||
              voice.lang.includes('en')
            );
            if (preferredVoice) {
              utterance.voice = preferredVoice;
            }
            
            utterance.onstart = () => {
              const now = Date.now();
              actualStartTimeRef.current = now - (newTime * 1000);
              startTimeRef.current = actualStartTimeRef.current;
            };
            
            utterance.onend = () => {
              handleStop();
              if (onQueueItemComplete) {
                onQueueItemComplete();
              }
            };
            
            utterance.onerror = (event) => {
              if (event.error !== 'interrupted' && event.error !== 'canceled') {
                setAudioError(`Speech error: ${event.error}`);
              }
            };
            
            utteranceRef.current = utterance;
            speechSynthesis.speak(utterance);
          }
        }
      }
    }
  }, [words, isPlaying, currentPlayingText, playbackRate, handleStop, onQueueItemComplete]);

  const handleWordClick = useCallback((wordIndex: number) => {
    if (words[wordIndex]) {
      handleSeek(words[wordIndex].start);
    }
  }, [words, handleSeek]);

  const handleSpeedChange = useCallback((newRate: number) => {
    const wasPlaying = isPlaying;
    if (wasPlaying) {
      handleStop();
    }
    setPlaybackRate(newRate);
    setHasSelectedSpeed(true);
    
    // Regenerate word timings with new speed
    if (currentPlayingText) {
      const newWords = generateWordTimings(currentPlayingText, newRate);
      setWords(newWords);
      setDuration(newWords[newWords.length - 1]?.end || 0);
    }
    
    if (wasPlaying) {
      setTimeout(() => {
        if (currentPlayingText) {
          playSectionDirectly(currentPlayingSection || 'unknown', currentPlayingText);
        }
      }, 100);
    }
  }, [isPlaying, currentPlayingText, currentPlayingSection, generateWordTimings, handleStop, playSectionDirectly]);

  const clearAudio = useCallback(() => {
    handleStop();
    setCurrentPlayingSection(null);
    setCurrentPlayingText('');
    setWords([]);
    setDuration(0);
    setAudioError(null);
  }, [handleStop]);

  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const value: AudioContextType = {
    audioUrl: null, // Web Speech API doesn't use URLs
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
    words,
    isMaximized,
    isTransitioning,
    isPreloading,
    generateAudioForSection,
    playSectionDirectly,
    playQueueItem,
    handlePlayPause,
    handleStop,
    handleSeek,
    handleWordClick,
    handleSpeedChange,
    setIsMaximized,
    setIsPreloading,
    setCurrentPlayingSection,
    setCurrentPlayingText,
    setWords,
    setAudioUrl: () => {}, // No-op for Web Speech API
    clearAudio,
    formatTime,
    onQueueItemComplete,
    setOnQueueItemComplete,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}; 
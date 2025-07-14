"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLexioState, useLexioActions } from "@/lib/store";
import { extractSummary } from "@/lib/firecrawl";
import { generateSpeech, cleanupAudioUrl, estimateTextDuration, clearTTSCache, getTTSCacheStats } from "@/lib/tts";
import VoiceSelector from "@/components/VoiceSelector";
import SmartChat from "@/components/SmartChat";

interface WordData {
  word: string;
  index: number;
  startTime: number;
  endTime: number;
  isWhitespace: boolean;
}

interface QueueItem {
  id: string;
  title: string;
  content: string;
}

type PlayingSection = 'summary' | `section-${number}` | null;

export default function ReadPage() {
  const router = useRouter();
  const { scrapedData, currentUrl, selectedVoiceId } = useLexioState();
  const { clearAll } = useLexioActions();
  
  // Audio state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [currentPlayingSection, setCurrentPlayingSection] = useState<PlayingSection>(null);
  const [currentPlayingText, setCurrentPlayingText] = useState('');
  const [wordsData, setWordsData] = useState<WordData[]>([]);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasSelectedSpeed, setHasSelectedSpeed] = useState(false);
  
  // Development cache state
  const [cacheStats, setCacheStats] = useState<any>(null);
  
  // Maximized player state
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  
  // Queue state
  const [listeningQueue, setListeningQueue] = useState<QueueItem[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  const [isQueuePlaying, setIsQueuePlaying] = useState(false);
  
  // Queue controls state
  const [controlsPlaying, setControlsPlaying] = useState(false);
  const [controlsProgress, setControlsProgress] = useState(0);
  const [controlsCurrentTime, setControlsCurrentTime] = useState(0);
  const [controlsShuffle, setControlsShuffle] = useState(false);
  const [controlsRepeat, setControlsRepeat] = useState(false);
  
  // Animation state for cards
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const highlightedWordRef = useRef<HTMLSpanElement>(null);

  // Handle initial card animations
  useEffect(() => {
    if (scrapedData && !hasAnimated) {
      // Set animating state immediately
      setIsAnimating(true);
      
      // Small delay to ensure initial state is rendered first
      const timer = setTimeout(() => {
        setHasAnimated(true);
        // Stop animation state after all cards have animated
        setTimeout(() => {
          setIsAnimating(false);
        }, 2200); // Allow time for all staggered animations to complete
      }, 150); // Slightly longer delay for more dramatic effect
      
      return () => clearTimeout(timer);
    }
  }, [scrapedData, hasAnimated]);

  // Sync control progress with actual audio playback (debounced)
  useEffect(() => {
    // Debounce rapid updates to prevent UI flashing
    const timeoutId = setTimeout(() => {
      if (isQueuePlaying && audioRef.current && !isNaN(currentTime) && !isNaN(duration)) {
        // Sync controls with actual audio time
        setControlsCurrentTime(currentTime);
        setControlsProgress(duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0);
        setControlsPlaying(isPlaying);
      } else if (!isQueuePlaying) {
        // Reset controls when not playing queue
        setControlsCurrentTime(0);
        setControlsProgress(0);
        setControlsPlaying(false);
      }
    }, 50); // Small debounce to prevent rapid updates

    return () => clearTimeout(timeoutId);
  }, [isQueuePlaying, currentTime, duration, isPlaying]);

  // Monitor queue length and auto-clear "now playing" state when queue becomes empty
  useEffect(() => {
    if (listeningQueue.length === 0 && (isQueuePlaying || currentPlayingSection || audioUrl)) {
      console.log('🧹 Queue empty: Auto-clearing now playing state');
      
      // Stop audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      // Clean up audio URL
      if (audioUrl) {
        cleanupAudioUrl(audioUrl);
        setAudioUrl(null);
      }
      
      // Clear all queue and playing state
      setIsQueuePlaying(false);
      setCurrentQueueIndex(-1);
      setCurrentPlayingSection(null);
      setCurrentPlayingText('');
      setCurrentWordIndex(-1);
      setWordsData([]);
      setIsPlaying(false);
      setControlsPlaying(false);
      setControlsProgress(0);
      setControlsCurrentTime(0);
      setIsMaximized(false);
      setIsPreloading(false);
    }
  }, [listeningQueue.length, isQueuePlaying, currentPlayingSection, audioUrl]);



  // Helper function to check if an item is in the queue
  const isInQueue = (itemId: string) => {
    return listeningQueue.some(item => item.id === itemId);
  };

  // Helper function to get available sections (not in queue)
  const getAvailableSections = () => {
    if (!scrapedData?.sections) return [];
    return scrapedData.sections.filter((_, index) => !isInQueue(`section-${index}`));
  };

  // Helper function to check if summary is available (not in queue)
  const isSummaryAvailable = () => {
    return !isInQueue('summary');
  };

  // Queue management functions
  const addToQueue = (item: QueueItem) => {
    setListeningQueue(prev => {
      // Prevent duplicates
      if (prev.find(qItem => qItem.id === item.id)) return prev;
      console.log(`➕ Adding "${item.title}" to queue`);
      return [...prev, item];
    });
  };

  const removeFromQueue = (id: string) => {
    setListeningQueue(prev => {
      const removedItem = prev.find(item => item.id === id);
      const newQueue = prev.filter(item => item.id !== id);
      
      if (removedItem) {
        console.log(`➖ Removing "${removedItem.title}" from queue`);
      }
      
      // If we removed the currently playing item or queue becomes empty
      if (newQueue.length === 0) {
        // Queue is now empty - stop everything
        stopQueuePlayback();
      } else if (isQueuePlaying) {
        // Check if we removed the currently playing item
        const removedItemIndex = prev.findIndex(item => item.id === id);
        if (removedItemIndex === currentQueueIndex) {
          // We removed the currently playing item - stop current playback
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          if (audioUrl) {
            cleanupAudioUrl(audioUrl);
            setAudioUrl(null);
          }
          
          // Update current index if needed
          if (currentQueueIndex >= newQueue.length) {
            setCurrentQueueIndex(newQueue.length - 1);
          }
          
          // Clear playing state until user manually starts again
          setCurrentPlayingSection(null);
          setCurrentPlayingText('');
          setCurrentWordIndex(-1);
          setWordsData([]);
          setIsPlaying(false);
          setControlsPlaying(false);
        } else if (removedItemIndex < currentQueueIndex) {
          // We removed an item before the current one - adjust index
          setCurrentQueueIndex(currentQueueIndex - 1);
        }
      }
      
      return newQueue;
    });
  };

  const stopQueuePlayback = () => {
    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Clean up audio URL
    if (audioUrl) {
      cleanupAudioUrl(audioUrl);
      setAudioUrl(null);
    }
    
    // Clear all queue and playing state
    setIsQueuePlaying(false);
    setCurrentQueueIndex(-1);
    setCurrentPlayingSection(null);
    setCurrentPlayingText('');
    setCurrentWordIndex(-1);
    setWordsData([]);
    setIsPlaying(false);
    setControlsPlaying(false);
    setControlsProgress(0);
    setControlsCurrentTime(0);
    setIsMaximized(false);
    setIsPreloading(false);
  };

  const clearQueue = () => {
    // Stop all playback first
    stopQueuePlayback();
    
    // Clear the queue
    setListeningQueue([]);
  };

  // Enhanced queue control functions with smooth state management
  const handleControlsPlayPause = () => {
    // Prevent rapid clicks during loading or transitions
    if (isPreloading) {
      console.log('⏸️ Play/Pause ignored: Audio is still loading');
      return;
    }
    
    // If there are items in the queue and nothing is currently playing, start the queue
    if (listeningQueue.length > 0 && !audioUrl && !isQueuePlaying) {
      playQueue();
      return;
    }

    // If queue is playing, pause/resume the current audio
    if (isQueuePlaying && audioRef.current) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
      } catch (error) {
        console.debug('Audio control action skipped:', error);
      }
      return;
    }

    // Fallback for individual audio
    if (audioRef.current && audioUrl) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
      } catch (error) {
        console.debug('Audio control action skipped:', error);
      }
    }
  };

  const handleControlsPrevious = async () => {
    if (!isQueuePlaying || currentQueueIndex <= 0) return;
    
    // Go to previous item in queue - generate word timings IMMEDIATELY
    const prevIndex = currentQueueIndex - 1;
    const prevItem = listeningQueue[prevIndex];
    const estimatedDuration = estimateTextDuration(prevItem.content);
    const timings = generateWordTimings(prevItem.content, estimatedDuration);
    
    // Set all states together for immediate word display
    setCurrentQueueIndex(prevIndex);
    setCurrentPlayingText(prevItem.content);
    setCurrentPlayingSection(prevItem.id as PlayingSection);
    setCurrentWordIndex(-1);
    setWordsData(timings); // Set word data immediately
    
    try {
      // Properly stop current audio before switching
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      // Cleanup current audio
      if (audioUrl) {
        cleanupAudioUrl(audioUrl);
      }
      
              const result = await generateSpeech(prevItem.content, {}, selectedVoiceId);
      setAudioUrl(result.audioUrl);
      
      // Auto-play previous item with proper error handling
      if (audioRef.current) {
        audioRef.current.load();
        try {
          await audioRef.current.play();
          setControlsPlaying(true);
        } catch (playError) {
          console.debug('Play interrupted, will start when user interacts:', playError);
          setControlsPlaying(false);
        }
      }
    } catch (error) {
      console.error('Error playing previous queue item:', error);
    }
  };

  const handleControlsNext = async () => {
    if (!isQueuePlaying || currentQueueIndex >= listeningQueue.length - 1) return;
    
    // Go to next item in queue - generate word timings IMMEDIATELY
    const nextIndex = currentQueueIndex + 1;
    const nextItem = listeningQueue[nextIndex];
    const estimatedDuration = estimateTextDuration(nextItem.content);
    const timings = generateWordTimings(nextItem.content, estimatedDuration);
    
    // Set all states together for immediate word display
    setCurrentQueueIndex(nextIndex);
    setCurrentPlayingText(nextItem.content);
    setCurrentPlayingSection(nextItem.id as PlayingSection);
    setCurrentWordIndex(-1);
    setWordsData(timings); // Set word data immediately
    
    try {
      // Properly stop current audio before switching
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      // Cleanup current audio
      if (audioUrl) {
        cleanupAudioUrl(audioUrl);
      }
      
      const result = await generateSpeech(nextItem.content, {}, selectedVoiceId);
      setAudioUrl(result.audioUrl);
      
      // Auto-play next item with proper error handling
      if (audioRef.current) {
        audioRef.current.load();
        try {
          await audioRef.current.play();
          setControlsPlaying(true);
        } catch (playError) {
          console.debug('Play interrupted, will start when user interacts:', playError);
          setControlsPlaying(false);
        }
      }
    } catch (error) {
      console.error('Error playing next queue item:', error);
    }
  };

  const handleControlsShuffle = () => {
    if (listeningQueue.length === 0) return;
    
    setControlsShuffle(!controlsShuffle);
    
    // If shuffle is being turned on, shuffle the queue
    if (!controlsShuffle) {
      const currentItem = listeningQueue[currentQueueIndex];
      const otherItems = listeningQueue.filter((_, index) => index !== currentQueueIndex);
      
      // Fisher-Yates shuffle for the remaining items
      for (let i = otherItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherItems[i], otherItems[j]] = [otherItems[j], otherItems[i]];
      }
      
      // Create new shuffled queue with current item first
      const shuffledQueue = currentQueueIndex !== -1 ? [currentItem, ...otherItems] : otherItems;
      setListeningQueue(shuffledQueue);
      if (currentQueueIndex !== -1) {
        setCurrentQueueIndex(0); // Current item is now first
      }
    }
  };

  const handleControlsRepeat = () => {
    setControlsRepeat(!controlsRepeat);
  };

  const formatControlsTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Add to queue functions for buttons
  const handleAddSectionToQueue = (sectionIndex: number) => {
    if (!scrapedData?.sections[sectionIndex]) return;
    
    const section = scrapedData.sections[sectionIndex];
    addToQueue({
      id: `section-${sectionIndex}`,
      title: section.title,
      content: section.content
    });
  };

  const handleAddSummaryToQueue = () => {
    if (!scrapedData) return;
    
    const summaryContent = extractSummary(scrapedData.cleanText || scrapedData.text, 1000);
    addToQueue({
      id: 'summary',
      title: 'Summary',
      content: summaryContent
    });
  };

  // Smart chat handlers
  const handleSmartAddToQueue = (sectionIndices: number[], explanation: string) => {
    if (!scrapedData) return;
    console.log(`🤖 Smart AI adding sections: ${sectionIndices.join(', ')} - ${explanation}`);
    sectionIndices.forEach(index => {
      if (index < scrapedData.sections.length) {
        handleAddSectionToQueue(index);
      }
    });
  };

  const handleSmartAddSummary = () => {
    console.log('🤖 Smart AI adding summary');
    handleAddSummaryToQueue();
  };

  // Get available sections for the chat component
  const getAvailableSectionsForChat = () => {
    if (!scrapedData) return [];
    return scrapedData.sections
      .map((section, index) => ({
        title: section.title,
        content: section.content,
        index: index
      }))
      .filter((_, index) => !isInQueue(`section-${index}`));
  };

  // Ultra-smooth queue playback with reliable loading completion
  const playQueue = async () => {
    if (listeningQueue.length === 0) return;
    
    const firstItem = listeningQueue[0];
    
    console.log('🚀 Queue: Starting playback for:', firstItem.title);
    
    // Generate word timings IMMEDIATELY before any other operations
    console.log('⏱️ Queue: Generating word timings immediately...');
    const estimatedDuration = estimateTextDuration(firstItem.content);
    const timings = generateWordTimings(firstItem.content, estimatedDuration);
    
    // Set all states together to minimize re-renders and ensure words show immediately
    setIsPreloading(true);
    setIsQueuePlaying(true);
    setCurrentQueueIndex(0);
    setIsMaximized(true); // Set maximized immediately to prevent flashing
    setIsTransitioning(false);
    setCurrentPlayingText(firstItem.content);
    setCurrentPlayingSection(firstItem.id as PlayingSection);
    setCurrentWordIndex(-1);
    setWordsData(timings); // Set word data immediately
    
    try {
      console.log('📡 Queue: Generating audio...');
      
      // Generate audio
      const result = await generateSpeech(firstItem.content, {}, selectedVoiceId);
      
      console.log('✅ Queue: Audio generated, setting up player...');
      
      // Set audio state
      setAudioUrl(result.audioUrl);
      
      // Update cache stats after generating audio
      if (process.env.NODE_ENV === 'development') {
        setCacheStats(getTTSCacheStats());
      }
      
      // Set up audio element
      if (result.audioUrl && audioRef.current) {
        console.log('🎵 Queue: Setting up audio element...');
        audioRef.current.load();
        
        // Wait a short moment for audio to be ready, but don't hang forever
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Update word timings with actual duration when available
        const updateTimingsWhenReady = () => {
          if (audioRef.current && audioRef.current.duration > 0 && !isNaN(audioRef.current.duration)) {
            console.log(`🎵 Queue: Updating timings with actual duration: ${audioRef.current.duration}s`);
            const actualTimings = generateWordTimings(firstItem.content, audioRef.current.duration);
            setWordsData(actualTimings);
          }
        };
        
        // Try to get actual duration immediately
        if (audioRef.current.readyState >= 1) {
          updateTimingsWhenReady();
        } else {
          // Listen for when metadata loads to update timings
          audioRef.current.addEventListener('loadedmetadata', updateTimingsWhenReady, { once: true });
        }
      }
      
      console.log('🎯 Queue: Completing loading state...');
      
      // Complete the loading state
      setIsPreloading(false);
      
      console.log('▶️ Queue: Starting playback...');
      
      // Start playback
      if (audioRef.current) {
        try {
          await audioRef.current.play();
          setControlsPlaying(true);
          console.log('✅ Queue: Playback started successfully');
        } catch (playError) {
          console.log('⚠️ Queue: Playback will start when user interacts');
          setControlsPlaying(false);
        }
      }
      
    } catch (error) {
      console.error('❌ Queue: Error during playback setup:', error);
      
      // Always clear loading state on error
      setIsQueuePlaying(false);
      setCurrentQueueIndex(-1);
      setIsMaximized(false);
      setIsTransitioning(false);
      setIsPreloading(false);
    }
  };

  // Handle automatic queue progression
  const playNextInQueue = useCallback(async () => {
    if (!isQueuePlaying || currentQueueIndex === -1) return;
    
    // Handle repeat functionality
    if (controlsRepeat) {
      // Repeat current item
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        try {
          await audioRef.current.play();
          setControlsPlaying(true);
        } catch (playError) {
          console.debug('Play interrupted during repeat:', playError);
          setControlsPlaying(false);
        }
      }
      return;
    }
    
    const nextIndex = currentQueueIndex + 1;
    if (nextIndex >= listeningQueue.length) {
      // Queue finished - stop everything completely
      console.log('🏁 Queue finished: Clearing all state');
      
      // Stop and cleanup audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (audioUrl) {
        cleanupAudioUrl(audioUrl);
        setAudioUrl(null);
      }
      
      // Clear all queue and playing state
      setIsQueuePlaying(false);
      setCurrentQueueIndex(-1);
      setCurrentPlayingSection(null);
      setCurrentPlayingText('');
      setCurrentWordIndex(-1);
      setWordsData([]);
      setIsPlaying(false);
      setControlsPlaying(false);
      setControlsProgress(0);
      setControlsCurrentTime(0);
      setIsMaximized(false);
      setIsPreloading(false);
      return;
    }
    
    // Move to next item - generate word timings IMMEDIATELY
    const nextItem = listeningQueue[nextIndex];
    const estimatedDuration = estimateTextDuration(nextItem.content);
    const timings = generateWordTimings(nextItem.content, estimatedDuration);
    
    // Set all states together for immediate word display
    setCurrentQueueIndex(nextIndex);
    setCurrentPlayingText(nextItem.content);
    setCurrentPlayingSection(nextItem.id as PlayingSection);
    setCurrentWordIndex(-1); // Reset word highlighting
    setWordsData(timings); // Set word data immediately
    
    try {
      // Cleanup previous audio
      if (audioUrl) {
        cleanupAudioUrl(audioUrl);
      }
      
      const result = await generateSpeech(nextItem.content, {}, selectedVoiceId);
      setAudioUrl(result.audioUrl);
      
      // Update cache stats after generating audio
      if (process.env.NODE_ENV === 'development') {
        setCacheStats(getTTSCacheStats());
      }
      
      // Reset controls for new track
      setControlsCurrentTime(0);
      setControlsProgress(0);
      
      // Auto-play next item with proper error handling
      if (audioRef.current) {
        audioRef.current.load();
        try {
          await audioRef.current.play();
          setControlsPlaying(true);
        } catch (playError) {
          console.debug('Play interrupted during queue progression:', playError);
          setControlsPlaying(false);
        }
      }
    } catch (error) {
      console.error('Error playing next queue item:', error);
      setIsQueuePlaying(false);
      setCurrentQueueIndex(-1);
      setControlsPlaying(false);
    }
  }, [isQueuePlaying, currentQueueIndex, listeningQueue, audioUrl, controlsRepeat, cleanupAudioUrl, generateSpeech, selectedVoiceId]);

  // Handle audio end for queue progression
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handleAudioEnd = () => {
      setIsPlaying(false);
      setCurrentWordIndex(-1);
      // If queue is playing, move to next item automatically
      if (isQueuePlaying) {
        playNextInQueue();
      }
    };

    audioElement.addEventListener('ended', handleAudioEnd);
    return () => audioElement.removeEventListener('ended', handleAudioEnd);
  }, [isQueuePlaying, playNextInQueue]);

  // Optimized word timing generation with better start timing
  const generateWordTimings = useCallback((text: string, audioDuration: number): WordData[] => {
    const words = text.split(/(\s+)/);
    const nonWhitespaceWords = words.filter(word => word.trim() !== '');
    
    // More precise timing calculation
    const totalSpeechTime = audioDuration * 0.98; // Less silence padding
    const averageWordDuration = totalSpeechTime / nonWhitespaceWords.length;
    
    let currentTime = 0.05; // Fixed small start offset instead of percentage
    const wordTimings: WordData[] = [];
    
    words.forEach((word, index) => {
      const isWhitespace = word.trim() === '';
      
      if (isWhitespace) {
        // Very minimal pause for whitespace to keep timing tight
        const pauseDuration = 0.01;
        wordTimings.push({
          word,
          index,
          startTime: currentTime,
          endTime: currentTime + pauseDuration,
          isWhitespace: true,
        });
        currentTime += pauseDuration;
      } else {
        // Base duration with length adjustment
        let wordDuration = averageWordDuration;
        
        // More conservative length factor to prevent timing drift
        const lengthFactor = Math.pow(word.length / 5, 0.5);
        wordDuration *= lengthFactor;
        
        // Reduced punctuation pauses to prevent accumulating delays
        let pauseAfter = 0;
        if (/[.!?]$/.test(word)) pauseAfter = averageWordDuration * 0.25;
        else if (/[,;:]$/.test(word)) pauseAfter = averageWordDuration * 0.1;
        
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
    
    // Normalize to exact audio duration
    const totalCalculatedTime = currentTime;
    const scaleFactor = (audioDuration - 0.05) / (totalCalculatedTime - 0.05); // Account for start offset
    
    wordTimings.forEach(timing => {
      if (!timing.isWhitespace) {
        timing.startTime = 0.05 + (timing.startTime - 0.05) * scaleFactor;
        timing.endTime = 0.05 + (timing.endTime - 0.05) * scaleFactor;
      }
    });
    
    return wordTimings;
  }, []);

  // Enhanced word finding with special handling for start of audio
  const findCurrentWordIndex = useCallback((currentTime: number): number => {
    if (wordsData.length === 0 || currentTime < 0) return -1;
    
    // Lookahead timing
    const speedLookahead = playbackRate >= 1.5 ? 0.2 : playbackRate >= 1.25 ? 0.12 : 0.06;
    const lookaheadTime = currentTime + speedLookahead;
    
    // Special handling for very start of audio (first 2 seconds)
    if (currentTime < 2.0) {
      // More aggressive progression at the start to prevent sticking
      for (let i = 0; i < wordsData.length; i++) {
        const word = wordsData[i];
        if (!word.isWhitespace) {
          // If we're past the word's start time, move to it immediately
          if (currentTime >= word.startTime - 0.05) {
            return i;
          }
        }
      }
    }
    
    // Primary check: lookahead time within word bounds
    for (let i = 0; i < wordsData.length; i++) {
      const word = wordsData[i];
      if (!word.isWhitespace) {
        if (lookaheadTime >= word.startTime && lookaheadTime <= word.endTime) {
          return i;
        }
      }
    }
    
    // Secondary check: current time within word bounds
    for (let i = 0; i < wordsData.length; i++) {
      const word = wordsData[i];
      if (!word.isWhitespace) {
        if (currentTime >= word.startTime && currentTime <= word.endTime) {
          return i;
        }
      }
    }
    
    // Tertiary check: very close upcoming word
    for (let i = 0; i < wordsData.length; i++) {
      const word = wordsData[i];
      if (!word.isWhitespace && word.startTime > currentTime) {
        const timeUntilWord = word.startTime - currentTime;
        if (timeUntilWord < speedLookahead * 1.2) {
          return i;
        }
        break;
      }
    }
    
    return -1;
  }, [wordsData, playbackRate]);

  // Auto-scroll to current word with improved performance
  const scrollToCurrentWord = useCallback(() => {
    if (highlightedWordRef.current && contentRef.current && isMaximized) {
      const wordElement = highlightedWordRef.current;
      const container = contentRef.current;
      
      // Only scroll in maximized mode and if element is available
      try {
        const wordRect = wordElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate scroll position with better thresholds
        const wordTop = wordRect.top - containerRect.top;
        const wordBottom = wordRect.bottom - containerRect.top;
        const containerHeight = containerRect.height;
        
        // Only scroll if the word is significantly out of view (larger buffer)
        if (wordTop < 150 || wordBottom > containerHeight - 150) {
          // Use requestAnimationFrame for smoother scrolling
          requestAnimationFrame(() => {
            wordElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
          });
        }
      } catch (error) {
        // Silently handle any scrolling errors to prevent UI issues
        console.debug('Auto-scroll skipped:', error);
      }
    }
  }, [isMaximized]);

  const generateAudioForSection = useCallback(async (sectionType: PlayingSection, customText?: string) => {
    if (!scrapedData || !sectionType) return;

    setIsGeneratingAudio(true);
    setAudioError(null);
    setCurrentPlayingSection(sectionType);

    try {
      let textToSpeak = '';

      // Get the text based on section type
      if (customText) {
        textToSpeak = customText;
              } else if (sectionType === 'summary') {
          textToSpeak = extractSummary(scrapedData.cleanText || scrapedData.text, 1000);
        } else if (sectionType.startsWith('section-')) {
          const sectionIndex = parseInt(sectionType.replace('section-', ''));
          const section = scrapedData.sections[sectionIndex];
          if (section) {
            textToSpeak = section.content;
          }
        }

      setCurrentPlayingText(textToSpeak);
      const result = await generateSpeech(textToSpeak, {}, selectedVoiceId);
      setAudioUrl(result.audioUrl);
      
      // Update cache stats after generating audio
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
  }, [scrapedData]);

  // High-frequency word index updates for accurate sync at all speeds
  useEffect(() => {
    if (isPlaying && wordsData.length > 0 && currentTime >= 0 && !isNaN(currentTime)) {
      
      // Ultra-high update frequency for silky smooth highlighting
      const updateFrequency = playbackRate >= 1.5 ? 6 : 10; // Even higher frequency for 1.5x speed
      
      let animationId: number;
      let lastUpdateTime = 0;
      
      const updateWordIndex = (timestamp: number) => {
        if (timestamp - lastUpdateTime >= updateFrequency) {
          const newWordIndex = findCurrentWordIndex(currentTime);
          
          // Update immediately for any valid change
          if (newWordIndex !== currentWordIndex && newWordIndex !== -1) {
            setCurrentWordIndex(newWordIndex);
          }
          
          lastUpdateTime = timestamp;
        }
        
        if (isPlaying) {
          animationId = requestAnimationFrame(updateWordIndex);
        }
      };
      
      animationId = requestAnimationFrame(updateWordIndex);
      
      return () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      };
    }
  }, [currentTime, isPlaying, wordsData, findCurrentWordIndex, currentWordIndex, playbackRate]);

  // Update cache stats in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const updateCacheStats = () => {
        const stats = getTTSCacheStats();
        setCacheStats(stats);
      };
      
      updateCacheStats();
      
      // Update cache stats after TTS operations
      const interval = setInterval(updateCacheStats, 2000);
      return () => clearInterval(interval);
    }
  }, []);

  // Auto-scroll when current word changes with debouncing
  useEffect(() => {
    if (currentWordIndex !== -1 && isPlaying && isMaximized) {
      // Use requestAnimationFrame for better performance
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(scrollToCurrentWord);
      }, 50); // Reduced delay for better responsiveness
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentWordIndex, isPlaying, isMaximized, scrollToCurrentWord]);

  // Generate word timings when audio loads
  useEffect(() => {
    if (audioRef.current && duration > 0 && currentPlayingText) {
      const timings = generateWordTimings(currentPlayingText, duration);
      setWordsData(timings);
    }
  }, [duration, currentPlayingText, generateWordTimings]);

  // Set playback rate when audio loads with error handling
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      try {
        // Only set playback rate if audio is ready
        if (audioRef.current.readyState >= 1) {
          audioRef.current.playbackRate = playbackRate;
        } else {
          // Wait for audio to be ready
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

  useEffect(() => {
    // Redirect to home if no data is available
    if (!scrapedData) {
      router.push("/");
      return;
    }

    // Cleanup function - removed auto audio generation
    return () => {
      if (audioUrl) {
        cleanupAudioUrl(audioUrl);
      }
    };
  }, [scrapedData, router, audioUrl]);

  const handleBack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (audioUrl) {
      cleanupAudioUrl(audioUrl);
    }
    clearAll();
    router.push("/");
  };

  const handleStartOver = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (audioUrl) {
      cleanupAudioUrl(audioUrl);
    }
    clearAll();
    router.push("/");
  };

  const handlePlayPause = () => {
    console.log('🎮 Play/Pause clicked - Queue length:', listeningQueue.length, 'audioUrl:', !!audioUrl, 'isQueuePlaying:', isQueuePlaying);
    
    // If there are items in the queue and nothing is currently playing, start the queue
    if (listeningQueue.length > 0 && !audioUrl && !isQueuePlaying) {
      console.log('🚀 Starting queue playback...');
      playQueue();
      return;
    }

    // If queue is playing, pause/resume the current audio
    if (isQueuePlaying && audioRef.current) {
      console.log('⏯️ Toggling queue playback - Currently playing:', isPlaying);
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        try {
          audioRef.current.play();
        } catch (playError) {
          console.debug('Play interrupted in queue controls:', playError);
        }
      }
      return;
    }

    console.log('🎵 Individual audio control - audioRef:', !!audioRef.current, 'audioUrl:', !!audioUrl);
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      try {
        audioRef.current.play();
      } catch (playError) {
        console.debug('Play interrupted in individual controls:', playError);
      }
    }
  };

  const handleStop = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setCurrentWordIndex(-1);
    setCurrentPlayingSection(null);
    setCurrentPlayingText('');
    
    // Stop queue playback if active
    if (isQueuePlaying) {
      setIsQueuePlaying(false);
      setCurrentQueueIndex(-1);
      setIsMaximized(false); // Close maximized view
      setControlsPlaying(false);
      setControlsProgress(0);
      setControlsCurrentTime(0);
    }
    
    if (audioUrl) {
      cleanupAudioUrl(audioUrl);
      setAudioUrl(null);
    }
  };

  const handleSeek = (newTime: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = newTime;
  };

  // Handle word click to seek to that position
  const handleWordClick = (wordIndex: number) => {
    if (!audioRef.current || wordIndex >= wordsData.length) return;
    
    const wordData = wordsData[wordIndex];
    if (!wordData.isWhitespace) {
      audioRef.current.currentTime = wordData.startTime;
      setCurrentWordIndex(wordIndex);
    }
  };

  // Handle playback speed change
  const handleSpeedChange = (newRate: number) => {
    if (!audioRef.current) return;
    
    setPlaybackRate(newRate);
    setHasSelectedSpeed(true); // Mark that user has selected a speed
    audioRef.current.playbackRate = newRate;
  };

  // Speed options
  const speedOptions = [0.75, 1, 1.25, 1.5];

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle cache clearing (development only)
  const handleClearCache = () => {
    if (clearTTSCache()) {
      setCacheStats(getTTSCacheStats());
    }
  };



  if (!scrapedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      <style jsx>{`
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        /* Card entrance animations - BEAUTIFUL & CLEAN */
        .card-animate-enter {
          opacity: 0;
          transform: translateY(60px) scale(0.92) rotateX(8deg);
          filter: blur(4px);
          box-shadow: 0 0 0 rgba(255, 255, 255, 0);
          transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          will-change: transform, opacity, filter, box-shadow;
        }
        
        .card-animate-enter.animate-visible {
          opacity: 1;
          transform: translateY(0) scale(1) rotateX(0deg);
          filter: blur(0px);
          box-shadow: 0 20px 60px rgba(255, 255, 255, 0.15);
        }
        
        /* Elegant staggered animation delays */
        .card-animate-delay-0 { transition-delay: 150ms; }
        .card-animate-delay-1 { transition-delay: 300ms; }
        .card-animate-delay-2 { transition-delay: 450ms; }
        .card-animate-delay-3 { transition-delay: 600ms; }
        .card-animate-delay-4 { transition-delay: 750ms; }
        .card-animate-delay-5 { transition-delay: 900ms; }
        
        /* Beautiful shimmer effect during entrance */
        .card-animate-enter::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
          );
          transition: left 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          z-index: 1;
          border-radius: inherit;
        }
        
        .card-animate-enter.animate-visible::before {
          left: 100%;
        }
        
        /* Smooth hover effect */
        .card-animate-enter:hover {
          transform: translateY(-4px) scale(1.02) rotateX(-2deg);
          box-shadow: 0 25px 70px rgba(255, 255, 255, 0.25);
          filter: brightness(1.05);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        /* Gentle floating animation after entrance */
        .card-animate-enter.animate-visible {
          animation: gentle-float 6s ease-in-out infinite 2s;
        }
        
        @keyframes gentle-float {
          0%, 100% {
            transform: translateY(0) scale(1) rotateX(0deg);
            box-shadow: 0 20px 60px rgba(255, 255, 255, 0.15);
          }
          50% {
            transform: translateY(-3px) scale(1.005) rotateX(0.5deg);
            box-shadow: 0 25px 70px rgba(255, 255, 255, 0.2);
          }
        }
        
        /* Ensure cards are visible once animation completes */
        .glass-card {
          opacity: 1;
          transform: translateY(0) scale(1);
          position: relative;
          overflow: hidden;
        }
        
        /* Beautiful content emergence */
        .content-container {
          animation: content-emerge 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        
        @keyframes content-emerge {
          0% {
            opacity: 0;
            transform: translateY(30px);
            filter: blur(2px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0px);
          }
        }
        
        /* Sparkle animation */
        @keyframes sparkle {
          0% {
            opacity: 0;
            transform: scale(0) translateY(10px);
          }
          50% {
            opacity: 1;
            transform: scale(1) translateY(-5px);
          }
          100% {
            opacity: 0;
            transform: scale(0.5) translateY(-15px);
          }
        }
        

        

        

      `}</style>
      {/* Hidden Audio Element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
              // Set playback rate immediately when metadata loads
              try {
                audioRef.current.playbackRate = playbackRate;
              } catch (error) {
                console.debug('Playback rate setting skipped during load:', error);
              }
            }
          }}
          onLoadedData={() => {
            // Audio is fully loaded and ready to play
            if (audioRef.current && audioRef.current.duration > 0 && !isNaN(audioRef.current.duration)) {
              // Update word timings with actual duration if we have text
              if (currentPlayingText) {
                const actualTimings = generateWordTimings(currentPlayingText, audioRef.current.duration);
                setWordsData(actualTimings);
              }
            }
          }}
          onCanPlay={() => {
            // Audio can start playing - ensure playback rate is set
            if (audioRef.current) {
              try {
                audioRef.current.playbackRate = playbackRate;
              } catch (error) {
                console.debug('Playback rate setting skipped during canplay:', error);
              }
            }
          }}
          onPlay={() => {
            setIsPlaying(true);
            // Reset word index to start fresh
            if (currentWordIndex === -1 && wordsData.length > 0) {
              setCurrentWordIndex(0);
            }
          }}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={() => {
            if (audioRef.current && !isNaN(audioRef.current.currentTime)) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onEnded={() => {
            // Audio end is handled by useEffect above for better queue management
          }}
          preload="auto"
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-300 hover:scale-105 group"
            >
              <svg className="w-5 h-5 group-hover:transform group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-mono-enhanced text-sm font-medium">Back</span>
            </button>
            
            <div className="flex items-center gap-4">
              {/* Development Cache Stats */}
              {process.env.NODE_ENV === 'development' && cacheStats?.enabled && (
                <div className="flex items-center gap-3 text-xs">
                  <div className="glass-card px-3 py-1 rounded-lg">
                    <span className="text-white/70 font-mono-enhanced">
                      TTS Cache: {cacheStats.count} items ({cacheStats.size})
                    </span>
                  </div>
                  {cacheStats.count > 0 && (
                    <button
                      onClick={handleClearCache}
                      className="text-white/50 hover:text-red-400 transition-colors duration-300 font-mono-enhanced"
                      title="Clear TTS cache"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              )}
              
              <div className="text-sm text-white/50 hidden sm:block font-mono-enhanced">
                {currentUrl && new URL(currentUrl).hostname}
              </div>
              <button
                onClick={handleStartOver}
                className="btn-premium px-6 py-2 rounded-lg font-mono-enhanced text-sm"
              >
                New Site
              </button>
            </div>
          </div>
        </div>
      </header>



      {/* Main Content */}
      <main ref={contentRef} className="min-h-screen">
        {/* Container with proper margins */}
        <div className={`max-w-[1800px] mx-auto px-8 lg:px-12 py-12 ${
          !hasAnimated ? 'content-container' : ''
        }`}>
          
          {/* Article Header - Full Width */}
          <div className="mb-16">
            <div className="max-w-5xl">
              <h1 className="text-display text-gradient mb-8 leading-tight">
                {scrapedData.title}
              </h1>
            
              {currentUrl && (
                <div className="flex items-center gap-3 text-sm text-white/60 mb-8 group hover:text-white/80 transition-colors duration-300">
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <a 
                    href={currentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-mono-enhanced hover:text-white neon-glow transition-all duration-300"
                  >
                    {currentUrl}
                  </a>
                </div>
              )}

              {/* Content Stats */}
                          <div className="flex flex-wrap gap-8 text-sm text-white/70 mb-8">
                <div className="flex items-center gap-3 micro-bounce glass-card px-4 py-2 rounded-lg">
                  <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-mono-enhanced">{scrapedData.text.split(' ').length.toLocaleString()} words</span>
                  {scrapedData.cleanText && scrapedData.cleanText !== scrapedData.text && (
                    <span className="text-white/60 text-xs font-mono-enhanced">
                      ({scrapedData.cleanText.split(' ').length.toLocaleString()} optimized)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 micro-bounce glass-card px-4 py-2 rounded-lg">
                  <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-mono-enhanced">~{Math.ceil(scrapedData.text.split(' ').length / 200)} min read</span>
                </div>
                <div className="flex items-center gap-3 micro-bounce glass-card px-4 py-2 rounded-lg">
                  <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  <span className="font-mono-enhanced">~{Math.ceil(estimateTextDuration(scrapedData.text) / 60)} min listen</span>
                </div>
                {audioUrl && (
                  <div className="flex items-center gap-3 micro-bounce glass-card px-4 py-2 rounded-lg neon-glow animate-pulse">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12 7-12 6z" />
                    </svg>
                    <span className="font-mono-enhanced text-white">Audio ready</span>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Main Layout Grid - Responsive Desktop/Mobile Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-10 items-start">
            
            {/* Content Cards Section - Takes up 8/12 columns */}
            <div className="xl:col-span-8">
              {/* Check if all content is in queue */}
              {getAvailableSections().length === 0 && !isSummaryAvailable() && scrapedData.sections.length <= 5 ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                  <div className="text-5xl mb-4">🎧</div>
                  <h3 className="text-lg font-bold text-white mb-2 font-mono-enhanced">All Content in Queue!</h3>
                  <p className="text-sm text-white/70 font-mono-enhanced">
                    All sections are now in your listening queue. Remove items from the queue to see them here again.
                  </p>
                </div>
              ) : (
                <>
                  {/* Responsive Cards Grid - 1 column mobile, 2 medium, 3 large */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
                
                {/* Section Cards - Only show sections not in queue */}
                {scrapedData.sections.slice(0, 5).map((section, index) => {
                  // Don't render if this section is in the queue
                  if (isInQueue(`section-${index}`)) return null;
                  
                  return (
                  <div 
                    key={index}
                    className={`w-full glass-card rounded-xl p-4 flex flex-col neon-glow h-40 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] ${
                      currentPlayingSection === `section-${index}` 
                        ? 'border-white/40 bg-white/8 animate-pulse shadow-white/20' 
                        : 'hover:bg-white/5'
                    } ${
                      isAnimating || !hasAnimated 
                        ? `card-animate-enter card-animate-delay-${index} ${hasAnimated ? 'animate-visible' : ''}` 
                        : ''
                    }`}
                  >
                    {/* Subtle sparkle effect during entrance */}
                    {(isAnimating || !hasAnimated) && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-1 h-1 bg-white rounded-full opacity-70"
                            style={{
                              left: `${20 + Math.random() * 60}%`,
                              top: `${20 + Math.random() * 60}%`,
                              animationDelay: `${index * 150 + i * 200}ms`,
                              animation: 'sparkle 1.5s ease-out forwards'
                            }}
                          />
                        ))}
                      </div>
                    )}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-md ${
                        index % 3 === 0 ? 'bg-gradient-to-r from-white/90 to-white/60' : 
                        index % 3 === 1 ? 'bg-gradient-to-r from-white/80 to-white/50' : 'bg-gradient-to-r from-white/85 to-white/55'
                      }`}></div>
                      <h3 className="text-xs font-semibold text-white truncate font-mono-enhanced">
                        {section.title}
                      </h3>
                    </div>

                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm text-white/80 leading-[1.4] font-mono-enhanced line-clamp-4">
                      {section.content.length > 120 ? section.content.substring(0, 120) + '...' : section.content}
                    </p>
                  </div>
                </div>
                  );
                })}



                               

                {/* Additional Sections (if more than 5) */}
                {scrapedData.sections.length > 5 && (
                  <div className={`w-full glass-card rounded-xl p-4 h-40 flex flex-col justify-center items-center text-center neon-glow micro-bounce shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:bg-white/5 ${
                    isAnimating || !hasAnimated 
                      ? `card-animate-enter card-animate-delay-5 ${hasAnimated ? 'animate-visible' : ''}` 
                      : ''
                  }`}>
                    <div className="w-10 h-10 glass-card rounded-full flex items-center justify-center mb-3 neon-glow">
                      <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <h3 className="text-xs font-semibold text-white mb-2 font-mono-enhanced">More Sections</h3>
                    <p className="text-xs text-white/70 font-mono-enhanced">
                      +{scrapedData.sections.length - 5} additional sections available
                    </p>
                  </div>
                )}

                {/* Summary Card - Only show if not in queue */}
                {scrapedData.text && isSummaryAvailable() && (
                  <div 
                    className={`w-full glass-card rounded-xl p-4 flex flex-col neon-glow h-40 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] ${
                      currentPlayingSection === 'summary' 
                        ? 'border-white/40 bg-white/8 animate-pulse shadow-white/20' 
                        : 'hover:bg-white/5'
                    } ${
                      isAnimating || !hasAnimated 
                        ? `card-animate-enter card-animate-delay-${scrapedData.sections.slice(0, 5).filter((_, i) => !isInQueue(`section-${i}`)).length} ${hasAnimated ? 'animate-visible' : ''}` 
                        : ''
                    }`}>
                    {/* Subtle sparkle effect during entrance */}
                    {(isAnimating || !hasAnimated) && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                        {[...Array(4)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-1 h-1 bg-white rounded-full opacity-70"
                            style={{
                              left: `${15 + Math.random() * 70}%`,
                              top: `${15 + Math.random() * 70}%`,
                              animationDelay: `${scrapedData.sections.slice(0, 5).filter((_, j) => !isInQueue(`section-${j}`)).length * 150 + i * 200}ms`,
                              animation: 'sparkle 1.5s ease-out forwards'
                            }}
                          />
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-gradient-to-r from-white/90 to-white/60 rounded-full shadow-md"></div>
                        <h3 className="text-xs font-semibold text-white font-mono-enhanced">Summary</h3>
                      </div>

                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm text-white/80 leading-[1.4] font-mono-enhanced line-clamp-4">
                        {extractSummary(scrapedData.text, 120)}
                      </p>
                    </div>
                  </div>
                )}
                  </div>
                </>
              )}
            </div>

            {/* Smart Chat & Listening Queue - Takes up 4/12 columns */}
            <div className="xl:col-span-4">
              <div className="xl:sticky xl:top-20 space-y-5">
                
                {/* Smart Chat Interface */}
                <div className="w-full queue-zone-enhanced rounded-xl p-3 gpu-accelerated shadow-lg">
                  <SmartChat
                    availableSections={getAvailableSectionsForChat()}
                    onAddToQueue={handleSmartAddToQueue}
                    onAddSummary={handleSmartAddSummary}
                    isProcessing={false}
                  />
                </div>

                {/* Listening Queue */}
                <div className="w-full min-h-[350px] lg:min-h-[450px] xl:min-h-[450px] queue-zone-enhanced rounded-xl p-4 gpu-accelerated flex flex-col overflow-hidden shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg text-gradient font-mono-enhanced">🎧 Listening Queue</h3>
                    {listeningQueue.length > 0 && (
                      <button
                        onClick={clearQueue}
                        className="text-xs text-white/50 hover:text-red-400 transition-all duration-300 btn-premium px-2 py-1 rounded font-mono-enhanced"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {listeningQueue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-sm transition-all duration-500 text-white/60">
                      <div className="text-4xl mb-4">📥</div>
                      <div className="text-base font-semibold mb-2 text-center font-mono-enhanced text-gradient">Your Listening Queue</div>
                      <div className="text-xs text-white/50 text-center px-4 font-mono-enhanced leading-relaxed">Use the Smart Learning Assistant above to tell me what you want to learn!</div>
                    </div>
                  ) : (
                    <>
                      {/* Currently Playing Item - Compact */}
                      {currentQueueIndex !== -1 && isQueuePlaying && listeningQueue[currentQueueIndex] && (
                        <div className="mb-4 glass-card rounded-xl p-3 shadow-lg shadow-white/20 border-2 border-white/30">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2.5 h-2.5 bg-white/90 rounded-full animate-pulse shadow-lg"></div>
                            <span className="text-xs font-semibold font-mono-enhanced text-gradient">Now Playing</span>
                          </div>
                          <h3 className="text-sm font-bold text-white mb-3 font-mono-enhanced truncate">
                            {listeningQueue[currentQueueIndex].title}
                          </h3>
                          
                          {/* Word-by-word highlighting display */}
                          <div className="glass-card p-3 rounded-lg mb-4 max-h-32 overflow-y-auto">
                            <div className="text-sm leading-relaxed font-mono-enhanced">
                              {wordsData.length > 0 ? (
                                wordsData.map((wordData, index) => (
                                  <span
                                    key={index}
                                    ref={currentWordIndex === index ? highlightedWordRef : null}
                                    className={`word-highlight inline-block ${
                                      wordData.isWhitespace 
                                        ? '' 
                                        : currentWordIndex === index && isPlaying
                                          ? 'active'
                                          : currentWordIndex > index
                                            ? 'text-white/60'
                                            : 'text-white/80 hover:text-white/90'
                                    } ${!wordData.isWhitespace ? 'cursor-pointer px-0.5 py-0.5 rounded' : ''}`}
                                    onClick={() => !wordData.isWhitespace && handleWordClick(index)}
                                  >
                                    {wordData.word}
                                  </span>
                                ))
                              ) : (
                                // Show all text immediately while word timings are being prepared
                                <div className="text-white/80">
                                  {listeningQueue[currentQueueIndex].content.split(/(\s+)/).map((part, index) => (
                                    <span
                                      key={index}
                                      className={part.trim() ? 'hover:text-white/90 cursor-pointer px-0.5 py-0.5 rounded' : ''}
                                    >
                                      {part}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Progress for current item */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-white/70 text-xs mb-2 font-mono-enhanced">
                              <span>{formatTime(currentTime)}</span>
                              <span>{formatTime(duration)}</span>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-white/90 to-white/60 rounded-full transition-all duration-300"
                                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Queue List */}
                      <div className="flex-1 space-y-2 mb-6 overflow-y-auto overflow-x-hidden px-1 py-1">
                        <h4 className="text-sm font-semibold text-white/70 mb-3 font-mono-enhanced">Queue ({listeningQueue.length} items)</h4>
                        {listeningQueue.map((item, index) => (
                          <div
                            key={item.id}
                            className={`glass-card p-3 rounded-xl text-sm transition-all duration-300 flex items-start justify-between shadow-md hover:shadow-lg ${
                              currentQueueIndex === index && isQueuePlaying
                                ? 'bg-white/10 text-white border border-white/40 shadow-lg shadow-white/10'
                                : 'text-white/80 hover:bg-white/5 hover:border-white/20'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-white/50 font-mono-enhanced">#{index + 1}</span>
                                {currentQueueIndex === index && isQueuePlaying && (
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-white/90 rounded-full animate-pulse"></div>
                                    <span className="text-xs text-white/90 font-medium font-mono-enhanced">Playing</span>
                                  </div>
                                )}
                              </div>
                              <div className="font-semibold text-xs truncate mb-1 font-mono-enhanced">{item.title}</div>
                              <div className="text-xs text-white/60 leading-relaxed font-mono-enhanced">
                                {item.content.slice(0, 70)}...
                              </div>
                            </div>
                            <button
                              onClick={() => removeFromQueue(item.id)}
                              className="ml-4 btn-premium p-2 rounded-lg transition-all duration-300 flex-shrink-0 hover:bg-red-500/20 hover:border-red-400/30 text-white/60 hover:text-red-400"
                              disabled={currentQueueIndex === index && isQueuePlaying}
                              title="Remove from queue (returns to main content)"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>


                    </>
                  )}

                  {/* Queue Status - Simple and Clean */}
                  {listeningQueue.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="text-center text-sm text-white/60 font-mono-enhanced">
                        {isQueuePlaying ? (
                          <div className="flex items-center justify-center gap-2 text-white/80">
                            <div className="w-2 h-2 bg-white/90 rounded-full animate-pulse"></div>
                            <span>Playing: {currentQueueIndex + 1} of {listeningQueue.length}</span>
                          </div>
                        ) : (
                          <span>{listeningQueue.length} items ready to play</span>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>

          {/* Currently Playing Info & Controls - Separate section below */}
          <div className={`mt-12 xl:mt-16 ${
            (audioUrl || listeningQueue.length > 0) && !isMaximized 
              ? 'pb-32 sm:pb-28' 
              : ''
          }`}>
            <div className="max-w-2xl">
              {/* Currently Playing Card */}
              {currentPlayingSection && audioUrl && (
                <div className="glass-card rounded-xl p-4 neon-glow">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-white/90 rounded-full animate-pulse shadow-lg"></div>
                    <span className="text-xs font-medium font-mono-enhanced text-gradient">Now Playing</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-white font-mono-enhanced truncate">
                    {currentPlayingSection === 'summary' ? 'Summary' :
                     currentPlayingSection?.startsWith('section-') ? 
                       scrapedData.sections[parseInt(currentPlayingSection.replace('section-', ''))]?.title || 'Section' : 
                       currentPlayingSection}
                  </h3>
                  {currentWordIndex !== -1 && wordsData[currentWordIndex] && (
                    <div className="glass-card px-3 py-1.5 rounded-lg inline-block">
                      <p className="text-xs text-white/70 font-mono-enhanced">
                        Word {wordsData.filter((word, index) => !word.isWhitespace && index <= currentWordIndex).length} of {wordsData.filter(word => !word.isWhitespace).length}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Audio Control Bar */}
      {(audioUrl || listeningQueue.length > 0) && !isMaximized && (
        <div className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-white/10 backdrop-blur-xl">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col gap-1">
                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/70 min-w-[3rem] text-right font-mono-enhanced">
                    {formatTime(currentTime)}
                  </span>
                  <div className="flex-1 relative">
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-white/90 to-white/60 transition-all duration-300 shadow-lg"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      value={currentTime}
                      onChange={(e) => handleSeek(Number(e.target.value))}
                      className="absolute inset-0 w-full h-1.5 opacity-0 cursor-pointer"
                      aria-label="Audio progress"
                    />
                  </div>
                  <span className="text-xs text-white/70 min-w-[3rem] font-mono-enhanced">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-center gap-6">
                  {/* Left & Center Group */}
                  <div className="flex items-center gap-4">
                                          {/* Left Side - Queue Navigation & Playback Controls */}
                      <div className="flex items-center gap-1">
                      {/* Shuffle - Only show when queue has items */}
                      {listeningQueue.length > 1 && (
                        <button
                          onClick={handleControlsShuffle}
                                                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-150 hover:scale-105 micro-bounce ${
                          controlsShuffle ? 'bg-white/20 text-white neon-glow' : 'glass-card text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                        aria-label="Shuffle queue"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4h6l4 4-4 4H4m16-8v8a4 4 0 01-8 0V8a4 4 0 018 0zM4 20h6l4-4-4-4H4" />
                          </svg>
                        </button>
                      )}

                      {/* Previous - Only show when queue is playing */}
                      {isQueuePlaying && listeningQueue.length > 1 && (
                        <button
                          onClick={handleControlsPrevious}
                          disabled={currentQueueIndex <= 0}
                          className="flex items-center justify-center w-8 h-8 rounded-full glass-card hover:bg-white/10 transition-all duration-150 hover:scale-105 micro-bounce disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Previous track"
                        >
                          <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                          </svg>
                        </button>
                      )}

                      {/* Play/Pause - Main control */}
                      <button
                        onClick={handlePlayPause}
                        disabled={!audioUrl && listeningQueue.length === 0}
                        className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-150 hover:scale-105 neon-glow ${
                          (isQueuePlaying ? controlsPlaying : isPlaying)
                            ? 'bg-red-500/20 text-red-400 border border-red-400/30'
                            : 'btn-premium'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        aria-label={(isQueuePlaying ? controlsPlaying : isPlaying) ? 'Pause' : 'Play'}
                      >
                        {(isQueuePlaying ? controlsPlaying : isPlaying) ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>

                      {/* Next - Only show when queue is playing */}
                      {isQueuePlaying && listeningQueue.length > 1 && (
                        <button
                          onClick={handleControlsNext}
                          disabled={currentQueueIndex >= listeningQueue.length - 1}
                          className="flex items-center justify-center w-8 h-8 rounded-full glass-card hover:bg-white/10 transition-all duration-150 hover:scale-105 micro-bounce disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Next track"
                        >
                          <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                          </svg>
                        </button>
                      )}

                      {/* Repeat - Only show when queue has items */}
                      {listeningQueue.length > 0 && (
                        <button
                          onClick={handleControlsRepeat}
                          className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-150 hover:scale-105 micro-bounce ${
                            controlsRepeat ? 'bg-white/20 text-white neon-glow' : 'glass-card text-white/60 hover:bg-white/10 hover:text-white'
                          }`}
                          aria-label="Repeat queue"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      )}
                      
                      <button
                        onClick={handleStop}
                        disabled={!audioUrl && !isQueuePlaying}
                        className="flex items-center justify-center w-8 h-8 rounded-full glass-card hover:bg-white/10 transition-all duration-150 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Stop"
                      >
                        <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10h6v4H9z" />
                        </svg>
                      </button>

                      {/* Maximize Button - Only show when queue is playing and not maximized */}
                      {isQueuePlaying && !isMaximized && (
                        <button
                          onClick={() => setIsMaximized(true)}
                          className="flex items-center justify-center w-8 h-8 rounded-full glass-card hover:bg-white/10 transition-all duration-150 hover:scale-105 neon-glow"
                          aria-label="Maximize Player"
                        >
                          <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Center - Status & Speed Control */}
                    <div className="flex items-center gap-2">
                      {/* Status Display */}
                      <div className="flex items-center gap-1.5 text-sm text-white/70">
                        {/* Queue Status */}
                        {isQueuePlaying && listeningQueue.length > 0 && currentQueueIndex !== -1 && (
                          <div className="flex items-center gap-2 glass-card px-2.5 py-1 rounded-lg">
                            <div className="w-1.5 h-1.5 bg-white/90 rounded-full animate-pulse"></div>
                            <span className="font-medium text-xs font-mono-enhanced text-white/70">
                              {currentQueueIndex + 1} of {listeningQueue.length}
                            </span>
                          </div>
                        )}
                        
                        {/* Individual Section Status */}
                        {currentPlayingSection && !isQueuePlaying && (
                          <div className="flex items-center gap-2 glass-card px-2.5 py-1 rounded-lg">
                            <div className="w-1.5 h-1.5 bg-white/90 rounded-full animate-pulse"></div>
                            <span className="font-medium text-xs font-mono-enhanced">
                              Playing: {
                                currentPlayingSection === 'summary' ? 'Summary' :
                                currentPlayingSection?.startsWith('section-') ? 
                                  `Section ${parseInt(currentPlayingSection.replace('section-', '')) + 1}` : 
                                  currentPlayingSection
                              }
                            </span>
                          </div>
                        )}

                        {/* Queue Available Indicator */}
                        {!isQueuePlaying && !currentPlayingSection && listeningQueue.length > 0 && (
                          <div className="flex items-center gap-2 glass-card px-2.5 py-1 rounded-lg">
                            <div className="w-1.5 h-1.5 bg-blue-400/90 rounded-full animate-pulse"></div>
                            <span className="font-medium text-xs font-mono-enhanced">
                              {listeningQueue.length} items ready to play
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Speed Control */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-white/50 hidden lg:block font-mono-enhanced">Speed:</span>
                                                <div className="flex items-center gap-0.5">
                          {speedOptions.map((speed) => (
                            <button
                              key={speed}
                              onClick={() => handleSpeedChange(speed)}
                              className={`px-2.5 py-1 rounded text-xs font-medium transition-all duration-150 font-mono-enhanced ${
                              playbackRate === speed
                                ? 'bg-white/15 text-white border border-white/30'
                                : 'bg-white/5 text-white/70 border border-transparent hover:bg-white/10 hover:text-white/90 hover:border-white/20'
                            }`}
                              role="button"
                              aria-pressed={playbackRate === speed}
                              aria-label={`Set playback speed to ${speed}x${playbackRate === speed ? ' (currently selected)' : ''}`}
                            >
                              {speed}×
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Voice Selector */}
                  <div className="flex items-center">
                    <VoiceSelector />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maximized Player Overlay */}
      {isMaximized && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex flex-col">
          {/* Header with Close Button */}
          <div className="flex justify-between items-center p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-white/90 rounded-full animate-pulse shadow-lg"></div>
              <span className="text-lg font-semibold font-mono-enhanced text-gradient">Narrate Player</span>
            </div>
            <button
              onClick={() => setIsMaximized(false)}
              className="w-10 h-10 rounded-full glass-card hover:bg-white/10 transition-all duration-300 hover:scale-110 neon-glow flex items-center justify-center"
              aria-label="Close maximized player"
            >
              <svg className="w-5 h-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="w-full max-w-5xl mx-auto p-6 text-center">

            {/* Now Playing Info - Compact */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1 font-mono-enhanced">
                {isQueuePlaying && listeningQueue.length > 0 && currentQueueIndex !== -1 
                  ? listeningQueue[currentQueueIndex]?.title 
                  : currentPlayingSection === 'summary' 
                    ? 'Summary' 
                    : currentPlayingSection?.startsWith('section-') 
                      ? `Section ${parseInt(currentPlayingSection.replace('section-', '')) + 1}` 
                      : 'Now Playing'
                }
              </h2>
              <p className="text-white/60 text-xs font-mono-enhanced">
                {isQueuePlaying && listeningQueue.length > 0 
                  ? `${currentQueueIndex + 1} of ${listeningQueue.length} in queue`
                  : scrapedData?.title
                }
              </p>
            </div>

            {/* Large Progress Bar - Compact */}
            <div className="mb-6">
              <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                ></div>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={currentTime}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                  aria-label="Audio progress"
                />
              </div>
              <div className="flex justify-between text-xs text-white/70 mt-1 font-mono-enhanced">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Large Controls - Always Visible */}
            <div className="flex items-center justify-center gap-6 mb-6">
              {/* Restart */}
              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = 0;
                    setCurrentWordIndex(-1);
                  }
                }}
                disabled={!audioUrl && listeningQueue.length === 0}
                className="flex items-center justify-center w-12 h-12 rounded-full glass-card hover:bg-white/10 transition-all duration-300 hover:scale-110 micro-bounce disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Restart from beginning"
              >
                <svg className="w-6 h-6 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>

              {/* Previous */}
              <button
                onClick={handleControlsPrevious}
                disabled={!isQueuePlaying || currentQueueIndex <= 0 || listeningQueue.length <= 1}
                className="flex items-center justify-center w-12 h-12 rounded-full glass-card hover:bg-white/10 transition-all duration-300 hover:scale-110 micro-bounce disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous track"
              >
                <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Play/Pause - Perfectly Centered */}
              <button
                onClick={handlePlayPause}
                disabled={!audioUrl && listeningQueue.length === 0}
                className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 hover:scale-110 neon-glow ${
                  (isQueuePlaying ? controlsPlaying : isPlaying)
                    ? 'bg-red-500/20 text-red-400 border border-red-400/30'
                    : 'btn-premium'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label={(isQueuePlaying ? controlsPlaying : isPlaying) ? 'Pause' : 'Play'}
              >
                {(isQueuePlaying ? controlsPlaying : isPlaying) ? (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 absolute" fill="currentColor" viewBox="0 0 24 24" style={{ left: '50%', top: '50%', transform: 'translate(-47%, -50%)' }}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Next */}
              <button
                onClick={handleControlsNext}
                disabled={!isQueuePlaying || currentQueueIndex >= listeningQueue.length - 1 || listeningQueue.length <= 1}
                className="flex items-center justify-center w-12 h-12 rounded-full glass-card hover:bg-white/10 transition-all duration-300 hover:scale-110 micro-bounce disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next track"
              >
                <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Loop/Repeat */}
              <button
                onClick={handleControlsRepeat}
                disabled={listeningQueue.length === 0}
                className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 hover:scale-110 micro-bounce disabled:opacity-30 disabled:cursor-not-allowed ${
                  controlsRepeat ? 'bg-white/20 text-white neon-glow border border-white/30' : 'glass-card text-white/60 hover:bg-white/10 hover:text-white'
                }`}
                aria-label="Loop current track"
              >
                <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/* Speed Controls - Compact */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-xs text-white/50 font-mono-enhanced">Speed:</span>
              <div className="flex items-center gap-1">
                {speedOptions.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150 hover:scale-105 font-mono-enhanced border ${
                      playbackRate === speed
                        ? 'bg-white/20 text-white border-white/30 shadow-sm'
                        : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white/90 hover:border-white/20'
                    }`}
                    role="button"
                    aria-pressed={playbackRate === speed}
                    aria-label={`Set playback speed to ${speed}x${playbackRate === speed ? ' (currently selected)' : ''}`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* All Words Display with Real-time Highlighting */}
            <div className="glass-card p-8 rounded-lg mb-20 min-h-[400px]" ref={contentRef}>
              <div className="text-sm text-white/60 mb-6 font-mono-enhanced text-center">
                Word {wordsData.filter((word, index) => !word.isWhitespace && index <= currentWordIndex).length} of {wordsData.filter(word => !word.isWhitespace).length}
              </div>
              <div className="text-lg leading-9 font-mono-enhanced text-left space-y-2" style={{ wordSpacing: '0.2em' }}>
                {wordsData.length > 0 ? (
                  wordsData.map((wordData, index) => (
                    <span
                      key={index}
                      ref={currentWordIndex === index ? highlightedWordRef : null}
                      className={`word-highlight inline-block ${
                        wordData.isWhitespace 
                          ? '' 
                          : currentWordIndex === index && isPlaying
                            ? 'active'
                            : currentWordIndex > index
                              ? 'text-white/60'
                              : 'text-white/80 hover:text-white/90'
                      } ${!wordData.isWhitespace ? 'cursor-pointer px-1 py-1 rounded transition-all duration-75 mx-0.5' : ''}`}
                      onClick={() => !wordData.isWhitespace && handleWordClick(index)}
                    >
                      {wordData.word}
                    </span>
                  ))
                ) : (
                  // Show all text immediately while word timings are being prepared
                  <div className="text-white/80">
                    {currentPlayingText.split(/(\s+)/).map((part, index) => (
                      <span
                        key={index}
                        className={part.trim() ? 'hover:text-white/90 cursor-pointer px-1 py-1 rounded transition-all duration-75 mx-0.5' : ''}
                      >
                        {part}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
} 
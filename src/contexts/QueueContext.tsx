"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { generateSpeech, cleanupAudioUrl, estimateTextDuration, getTTSCacheStats } from '@/lib/tts';
import { useLexioState } from '@/lib/store';
import { useAudio } from './AudioContext';

interface QueueItem {
  id: string;
  title: string;
  content: string;
}

interface QueueContextType {
  // Queue state
  listeningQueue: QueueItem[];
  currentQueueIndex: number;
  isQueuePlaying: boolean;
  
  // Queue controls state
  controlsPlaying: boolean;
  controlsProgress: number;
  controlsCurrentTime: number;
  controlsShuffle: boolean;
  controlsRepeat: boolean;
  
  // Queue management
  addToQueue: (item: QueueItem) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  isInQueue: (itemId: string) => boolean;
  
  // Queue playback
  playQueue: () => Promise<void>;
  stopQueuePlayback: () => void;
  playNextInQueue: () => Promise<void>;
  
  // Queue controls
  handleControlsPlayPause: () => void;
  handleControlsPrevious: () => Promise<void>;
  handleControlsNext: () => Promise<void>;
  handleControlsShuffle: () => void;
  handleControlsRepeat: () => void;
  
  // Helper functions
  formatControlsTime: (seconds: number) => string;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (context === undefined) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
};

interface QueueProviderProps {
  children: React.ReactNode;
}

export const QueueProvider: React.FC<QueueProviderProps> = ({ children }) => {
  const { selectedVoiceId } = useLexioState();
  const { 
    audioRef, 
    audioUrl, 
    isPlaying,
    currentTime,
    duration,
    setIsMaximized,
    setIsPreloading,
    generateWordTimings,
    setCurrentPlayingSection,
    setCurrentPlayingText,
    setCurrentWordIndex,
    setWordsData,
    setAudioUrl,
    clearAudio
  } = useAudio();
  
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

  // Helper function to check if an item is in the queue
  const isInQueue = useCallback((itemId: string) => {
    return listeningQueue.some(item => item.id === itemId);
  }, [listeningQueue]);

  // Queue management functions
  const addToQueue = useCallback((item: QueueItem) => {
    setListeningQueue(prev => {
      if (prev.find(qItem => qItem.id === item.id)) return prev;
      console.log(`➕ Adding "${item.title}" to queue`);
      return [...prev, item];
    });
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setListeningQueue(prev => {
      const removedItem = prev.find(item => item.id === id);
      const newQueue = prev.filter(item => item.id !== id);
      
      if (removedItem) {
        console.log(`➖ Removing "${removedItem.title}" from queue`);
      }
      
      if (newQueue.length === 0) {
        stopQueuePlayback();
      } else if (isQueuePlaying) {
        const removedItemIndex = prev.findIndex(item => item.id === id);
        if (removedItemIndex === currentQueueIndex) {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          if (audioUrl) {
            clearAudio();
          }
          
          if (currentQueueIndex >= newQueue.length) {
            setCurrentQueueIndex(newQueue.length - 1);
          }
          
          setCurrentPlayingSection(null);
          setCurrentPlayingText('');
          setCurrentWordIndex(-1);
          setWordsData([]);
          setControlsPlaying(false);
        } else if (removedItemIndex < currentQueueIndex) {
          setCurrentQueueIndex(currentQueueIndex - 1);
        }
      }
      
      return newQueue;
    });
  }, [isQueuePlaying, currentQueueIndex, audioRef, audioUrl, clearAudio, setCurrentPlayingSection, setCurrentPlayingText, setCurrentWordIndex, setWordsData]);

  const stopQueuePlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    clearAudio();
    
    setIsQueuePlaying(false);
    setCurrentQueueIndex(-1);
    setCurrentPlayingSection(null);
    setCurrentPlayingText('');
    setCurrentWordIndex(-1);
    setWordsData([]);
    setControlsPlaying(false);
    setControlsProgress(0);
    setControlsCurrentTime(0);
    setIsMaximized(false);
    setIsPreloading(false);
  }, [audioRef, clearAudio, setCurrentPlayingSection, setCurrentPlayingText, setCurrentWordIndex, setWordsData, setIsMaximized, setIsPreloading]);

  const clearQueue = useCallback(() => {
    stopQueuePlayback();
    setListeningQueue([]);
  }, [stopQueuePlayback]);

  // Ultra-smooth queue playback
  const playQueue = useCallback(async () => {
    if (listeningQueue.length === 0) return;
    
    const firstItem = listeningQueue[0];
    
    console.log('🚀 Queue: Starting playback for:', firstItem.title);
    
    // Set basic state and content immediately for instant display
    setIsQueuePlaying(true);
    setCurrentQueueIndex(0);
    setCurrentPlayingText(firstItem.content);
    setCurrentPlayingSection(firstItem.id as any);
    setCurrentWordIndex(-1);
    
    // Generate initial timings with estimated duration for immediate display
    const estimatedDuration = estimateTextDuration(firstItem.content);
    const initialTimings = generateWordTimings(firstItem.content, estimatedDuration);
    setWordsData(initialTimings);
    
    // Since maximization is handled by handleControlsPlayPause, just clear preloading
    setIsPreloading(false);
    
    try {
      const result = await generateSpeech(firstItem.content, {}, selectedVoiceId);
      setAudioUrl(result.audioUrl);
      
      if (process.env.NODE_ENV === 'development') {
        // Update cache stats
      }
      
      // Load and prepare audio in the background
      if (audioRef.current) {
        audioRef.current.load();
        
        const waitForAudioReady = () => {
          return new Promise<void>((resolve) => {
            const checkReady = () => {
              if (audioRef.current && audioRef.current.readyState >= 2) {
                // Update word timings with actual duration
                const actualDuration = audioRef.current.duration;
                if (actualDuration && actualDuration > 0) {
                  const actualTimings = generateWordTimings(firstItem.content, actualDuration);
                  setWordsData(actualTimings);
                  console.log('📝 Queue: Updated word timings with actual duration:', actualDuration);
                }
                resolve();
              } else {
                setTimeout(checkReady, 50);
              }
            };
            checkReady();
          });
        };
        
        await waitForAudioReady();
        
        console.log('📺 Queue: Audio ready, starting playback');
        
        try {
          await audioRef.current.play();
          setControlsPlaying(true);
        } catch (playError) {
          console.log('⚠️ Queue: Playback will start when user interacts');
          setControlsPlaying(false);
        }
      }
      
    } catch (error) {
      console.error('❌ Queue: Error during playback setup:', error);
      setIsQueuePlaying(false);
      setCurrentQueueIndex(-1);
      setIsPreloading(false);
    }
  }, [listeningQueue, estimateTextDuration, generateWordTimings, setIsPreloading, setIsQueuePlaying, setIsMaximized, setCurrentPlayingText, setCurrentPlayingSection, setCurrentWordIndex, setWordsData, selectedVoiceId, audioRef]);

  // Handle automatic queue progression
  const playNextInQueue = useCallback(async () => {
    if (!isQueuePlaying || currentQueueIndex === -1) return;
    
    if (controlsRepeat) {
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
      console.log('🏁 Queue finished: Clearing all state');
      stopQueuePlayback();
      return;
    }
    
    const nextItem = listeningQueue[nextIndex];
    const estimatedDuration = estimateTextDuration(nextItem.content);
    const timings = generateWordTimings(nextItem.content, estimatedDuration);
    
    setCurrentQueueIndex(nextIndex);
    setIsMaximized(true); // Ensure maximization stays active during queue transitions
    setCurrentPlayingText(nextItem.content);
    setCurrentPlayingSection(nextItem.id as any);
    setCurrentWordIndex(-1);
    setWordsData(timings);
    
    try {
      if (audioUrl) {
        clearAudio();
      }
      
      const result = await generateSpeech(nextItem.content, {}, selectedVoiceId);
      setAudioUrl(result.audioUrl);
      
      if (process.env.NODE_ENV === 'development') {
        // Update cache stats
      }
      
      setControlsCurrentTime(0);
      setControlsProgress(0);
      
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
  }, [isQueuePlaying, currentQueueIndex, listeningQueue, controlsRepeat, audioRef, audioUrl, clearAudio, estimateTextDuration, generateWordTimings, setCurrentPlayingText, setCurrentPlayingSection, setCurrentWordIndex, setWordsData, setAudioUrl, selectedVoiceId, stopQueuePlayback]);

  // Enhanced queue control functions
  const handleControlsPlayPause = useCallback(() => {
    console.log('🎮 Controls: Play button clicked', {
      queueLength: listeningQueue.length,
      hasAudioUrl: !!audioUrl,
      isQueuePlaying,
      isPlaying,
      currentQueueIndex
    });

    // Priority 1: Start queue playback if queue has items and not currently playing
    if (listeningQueue.length > 0 && !isQueuePlaying) {
      console.log('🎮 Controls: Starting queue playback and immediately maximizing');
      // Clear any residual audio first
      if (audioUrl) {
        clearAudio();
      }
      // Immediately maximize the player when starting queue
      setIsMaximized(true);
      playQueue();
      return;
    }

    // Priority 2: Handle queue playback controls
    if (isQueuePlaying && audioRef.current) {
      // Ensure maximization when resuming queue playback
      if (!isPlaying) {
        console.log('🎮 Controls: Resuming queue playback and maximizing');
        setIsMaximized(true);
      }
      
      try {
        if (isPlaying) {
          console.log('🎮 Controls: Pausing queue playback');
          audioRef.current.pause();
        } else {
          console.log('🎮 Controls: Playing queue audio');
          audioRef.current.play();
        }
      } catch (error) {
        console.debug('Audio control action skipped:', error);
      }
      return;
    }

    // Priority 3: Handle individual audio playback
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
  }, [listeningQueue.length, audioUrl, isQueuePlaying, audioRef, isPlaying, playQueue, setIsMaximized, clearAudio, currentQueueIndex]);

  const handleControlsPrevious = useCallback(async () => {
    if (!isQueuePlaying || currentQueueIndex <= 0) return;
    
    const prevIndex = currentQueueIndex - 1;
    const prevItem = listeningQueue[prevIndex];
    const estimatedDuration = estimateTextDuration(prevItem.content);
    const timings = generateWordTimings(prevItem.content, estimatedDuration);
    
    setCurrentQueueIndex(prevIndex);
    setIsMaximized(true); // Maintain maximization during manual navigation
    setCurrentPlayingText(prevItem.content);
    setCurrentPlayingSection(prevItem.id as any);
    setCurrentWordIndex(-1);
    setWordsData(timings);
    
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      if (audioUrl) {
        clearAudio();
      }
      
      const result = await generateSpeech(prevItem.content, {}, selectedVoiceId);
      setAudioUrl(result.audioUrl);
      
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
  }, [isQueuePlaying, currentQueueIndex, listeningQueue, estimateTextDuration, generateWordTimings, setCurrentPlayingText, setCurrentPlayingSection, setCurrentWordIndex, setWordsData, audioRef, audioUrl, clearAudio, setAudioUrl, selectedVoiceId]);

  const handleControlsNext = useCallback(async () => {
    if (!isQueuePlaying || currentQueueIndex >= listeningQueue.length - 1) return;
    
    const nextIndex = currentQueueIndex + 1;
    const nextItem = listeningQueue[nextIndex];
    const estimatedDuration = estimateTextDuration(nextItem.content);
    const timings = generateWordTimings(nextItem.content, estimatedDuration);
    
    setCurrentQueueIndex(nextIndex);
    setIsMaximized(true); // Maintain maximization during manual navigation
    setCurrentPlayingText(nextItem.content);
    setCurrentPlayingSection(nextItem.id as any);
    setCurrentWordIndex(-1);
    setWordsData(timings);
    
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      if (audioUrl) {
        clearAudio();
      }
      
      const result = await generateSpeech(nextItem.content, {}, selectedVoiceId);
      setAudioUrl(result.audioUrl);
      
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
  }, [isQueuePlaying, currentQueueIndex, listeningQueue, estimateTextDuration, generateWordTimings, setCurrentPlayingText, setCurrentPlayingSection, setCurrentWordIndex, setWordsData, audioRef, audioUrl, clearAudio, setAudioUrl, selectedVoiceId]);

  const handleControlsShuffle = useCallback(() => {
    if (listeningQueue.length === 0) return;
    
    setControlsShuffle(!controlsShuffle);
    
    if (!controlsShuffle) {
      const currentItem = listeningQueue[currentQueueIndex];
      const otherItems = listeningQueue.filter((_, index) => index !== currentQueueIndex);
      
      for (let i = otherItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherItems[i], otherItems[j]] = [otherItems[j], otherItems[i]];
      }
      
      const shuffledQueue = currentQueueIndex !== -1 ? [currentItem, ...otherItems] : otherItems;
      setListeningQueue(shuffledQueue);
      if (currentQueueIndex !== -1) {
        setCurrentQueueIndex(0);
      }
    }
  }, [listeningQueue, controlsShuffle, currentQueueIndex]);

  const handleControlsRepeat = useCallback(() => {
    setControlsRepeat(!controlsRepeat);
  }, [controlsRepeat]);

  const formatControlsTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Sync control progress with actual audio playback
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isQueuePlaying && audioRef.current && !isNaN(currentTime) && !isNaN(duration)) {
        setControlsCurrentTime(currentTime);
        setControlsProgress(duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0);
        setControlsPlaying(isPlaying);
      } else if (!isQueuePlaying) {
        setControlsCurrentTime(0);
        setControlsProgress(0);
        setControlsPlaying(false);
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [isQueuePlaying, currentTime, duration, isPlaying, audioRef]);

  // Monitor queue length and auto-clear
  useEffect(() => {
    if (listeningQueue.length === 0 && (isQueuePlaying || audioUrl)) {
      console.log('🧹 Queue empty: Auto-clearing now playing state');
      stopQueuePlayback();
    }
  }, [listeningQueue.length, isQueuePlaying, audioUrl, stopQueuePlayback]);

  // Handle audio end for queue progression
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handleAudioEnd = () => {
      if (isQueuePlaying) {
        playNextInQueue();
      }
    };

    audioElement.addEventListener('ended', handleAudioEnd);
    return () => audioElement.removeEventListener('ended', handleAudioEnd);
  }, [isQueuePlaying, playNextInQueue, audioRef]);

  const value: QueueContextType = {
    // Queue state
    listeningQueue,
    currentQueueIndex,
    isQueuePlaying,
    
    // Queue controls state
    controlsPlaying,
    controlsProgress,
    controlsCurrentTime,
    controlsShuffle,
    controlsRepeat,
    
    // Queue management
    addToQueue,
    removeFromQueue,
    clearQueue,
    isInQueue,
    
    // Queue playback
    playQueue,
    stopQueuePlayback,
    playNextInQueue,
    
    // Queue controls
    handleControlsPlayPause,
    handleControlsPrevious,
    handleControlsNext,
    handleControlsShuffle,
    handleControlsRepeat,
    
    // Helper functions
    formatControlsTime,
  };

  return (
    <QueueContext.Provider value={value}>
      {children}
    </QueueContext.Provider>
  );
}; 
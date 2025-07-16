"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { generateSpeech } from '@/lib/tts';
import { useLexioState } from '@/lib/store';
import { useAudio } from './AudioContext';
import { getDemoData } from '@/lib/demo-data';

type PlayingSection = 'summary' | `section-${number}` | null;

interface QueueItem {
  id: string;
  title: string;
  content: string;
  error?: string | null; // Track audio generation errors
  isLoading?: boolean; // Track loading state
}

interface QueueContextType {
  listeningQueue: QueueItem[];
  currentQueueIndex: number;
  isQueuePlaying: boolean;
  controlsPlaying: boolean;
  controlsProgress: number;
  controlsCurrentTime: number;
  controlsShuffle: boolean;
  controlsRepeat: boolean;
  lastKnownContent: string;
  addToQueue: (item: QueueItem) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  isInQueue: (itemId: string) => boolean;
  playQueue: () => Promise<void>;
  stopQueuePlayback: () => void;
  playNextInQueue: () => Promise<void>;
  retryCurrentItem: () => Promise<void>;
  handleControlsPlayPause: () => void;
  handleControlsPrevious: () => Promise<void>;
  handleControlsNext: () => Promise<void>;
  handleControlsShuffle: () => void;
  handleControlsRepeat: () => void;
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
    isPlaying,
    currentTime,
    duration,
    setIsMaximized,
    setIsPreloading,
    setCurrentPlayingSection,
    setCurrentPlayingText,
    setWords,
    setAudioUrl,
    clearAudio,
  } = useAudio();

  const [listeningQueue, setListeningQueue] = useState<QueueItem[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  const [isQueuePlaying, setIsQueuePlaying] = useState(false);
  const [controlsPlaying, setControlsPlaying] = useState(false);
  const [controlsProgress, setControlsProgress] = useState(0);
  const [controlsCurrentTime, setControlsCurrentTime] = useState(0);
  const [controlsShuffle, setControlsShuffle] = useState(false);
  const [controlsRepeat, setControlsRepeat] = useState(false);
  
  // Persistent content backup to prevent "No content available" flashing
  const [lastKnownContent, setLastKnownContent] = useState<string>('');

  const isInQueue = useCallback((itemId: string) => {
    return listeningQueue.some(item => item.id === itemId);
  }, [listeningQueue]);

  const addToQueue = useCallback((item: QueueItem) => {
    // Validate item content
    if (!item.content || item.content.trim().length === 0) {
      console.error('Attempted to add queue item with no content:', item);
      return;
    }
    
    // Validate required fields
    if (!item.id || !item.title) {
      console.error('Queue item missing required fields:', item);
      return;
    }
    
    console.log('Adding to queue:', {
      id: item.id,
      title: item.title,
      contentLength: item.content.length,
      contentPreview: item.content.substring(0, 100) + (item.content.length > 100 ? '...' : '')
    });
    
    setListeningQueue(prev => {
      // Check if item already exists
      if (prev.find(qItem => qItem.id === item.id)) {
        console.log('Item already in queue:', item.id);
        return prev;
      }
      
      const newQueue = [...prev, item];
      console.log('Queue updated, new length:', newQueue.length);
      return newQueue;
    });
  }, []);

  const stopQueuePlayback = useCallback(() => {
    console.log('stopQueuePlayback called - this will clear audio!');
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    clearAudio();
    setIsQueuePlaying(false);
    setCurrentQueueIndex(-1);
    setCurrentPlayingSection(null);
    setCurrentPlayingText('');
    setWords([]);
    setAudioUrl(null);
    setIsPreloading(false);
  }, [audioRef, clearAudio, setIsPreloading, setCurrentPlayingText, setCurrentPlayingSection, setWords, setAudioUrl]);

  const removeFromQueue = useCallback((id: string) => {
    setListeningQueue(prev => {
      const newQueue = prev.filter(item => item.id !== id);
      return newQueue;
    });
  }, []);

  const clearQueue = useCallback(() => {
    stopQueuePlayback();
    setListeningQueue([]);
  }, [stopQueuePlayback]);

  // Clear any existing error state for a queue item
  const clearItemError = useCallback((itemId: string) => {
    setListeningQueue(prev => prev.map(item => 
      item.id === itemId ? { ...item, error: null, isLoading: false } : item
    ));
  }, []);

  // Set error state for a queue item
  const setItemError = useCallback((itemId: string, error: string) => {
    setListeningQueue(prev => prev.map(item => 
      item.id === itemId ? { ...item, error, isLoading: false } : item
    ));
  }, []);

  // Set loading state for a queue item
  const setItemLoading = useCallback((itemId: string, isLoading: boolean) => {
    setListeningQueue(prev => prev.map(item => 
      item.id === itemId ? { ...item, isLoading, error: isLoading ? null : item.error } : item
    ));
  }, []);

  const playQueueItem = useCallback(async (index: number) => {
    if (index < 0 || index >= listeningQueue.length) {
      console.error('Invalid queue index:', index, 'Queue length:', listeningQueue.length);
      return;
    }
    
    const item = listeningQueue[index];
    
    console.log('🎯 Playing queue item:', {
      index,
      id: item.id,
      title: item.title,
      contentLength: item.content?.length || 0
    });
    
    // Validate content before proceeding
    if (!item.content || item.content.trim().length === 0) {
      console.error('Queue item has no content:', item);
      return;
    }

    // --- DEMO MODE TEMPORARILY DISABLED FOR DATA COLLECTION ---
    // 
    // AFTER COLLECTING DATA: 
    // 1. Paste your API responses into src/lib/demo-data.ts
    // 2. Uncomment the block below (remove the // from each line)
    // 3. Comment out or delete this instruction block
    // 4. Your demo mode will be active!

    // const demoData = getDemoData(item.id);
    // if (demoData) {
    //   console.log(`🎬 DEMO MODE: Loading hardcoded audio for: ${item.id}`);
    //   setIsPreloading(true);
    //   setItemLoading(item.id, true);
    //   setCurrentPlayingText(item.content);
    //   setLastKnownContent(item.content);
    //   setIsQueuePlaying(true);
    //   setCurrentQueueIndex(index);
    //   setCurrentPlayingSection(item.id as PlayingSection);
    //   clearAudio();
    //   await new Promise(resolve => setTimeout(resolve, 1500));
    //   const cachedAudioUrl = URL.createObjectURL(demoData.audioBlob);
    //   setAudioUrl(cachedAudioUrl);
    //   setWords(demoData.wordTimings);
    //   setIsPreloading(false);
    //   setItemLoading(item.id, false);
    //   console.log('✅ Demo audio loaded successfully');
    //   return;
    // }

    // --- END OF DEMO LOGIC ---

    console.log(`🌐 LIVE MODE: Making API call for: ${item.id}`);
    
    // Clear any existing error and set loading state
    clearItemError(item.id);
    setItemLoading(item.id, true);
    setIsPreloading(true);
    
    // Set text content and queue state
    setCurrentPlayingText(item.content);
    setLastKnownContent(item.content);
    setIsQueuePlaying(true);
    setCurrentQueueIndex(index);
    setCurrentPlayingSection(item.id as PlayingSection);
    
    // Clean up previous audio
    clearAudio();
    
    try {
      console.log('🎯 Generating speech audio for:', item.id);
      
      const result = await generateSpeech(item.content, {}, selectedVoiceId);
      
      if (!result.audioUrl) {
        throw new Error("No audio URL generated");
      }
      
      console.log('✅ Audio generated successfully');
      
      // Set word timings if available
      if (result.wordTimings && result.wordTimings.length > 0) {
        const wordData = result.wordTimings.map((timing) => ({
          text: timing.text,
          start: timing.start,
          end: timing.end
        }));
        setWords(wordData);
      }
      
      // Set the audio URL - AudioContext onCanPlay will handle automatic playback
      setAudioUrl(result.audioUrl);
      setIsPreloading(false);
      setItemLoading(item.id, false);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Audio generation failed';
      console.error('❌ TTS Generation failed for item:', item.id, error);

      // --- START OF CRITICAL FIX ---

      // 1. Immediately clear all audio-related state to prevent stale playback.
      clearAudio();

      // 2. Set a specific error on the queue item for the UI to display.
      setItemError(item.id, errorMessage);

      // 3. Ensure all loading states are turned off.
      setIsPreloading(false);
      setItemLoading(item.id, false);

      // --- END OF CRITICAL FIX ---
    }
  }, [listeningQueue, selectedVoiceId, setIsQueuePlaying, setCurrentQueueIndex, setCurrentPlayingText, setCurrentPlayingSection, setWords, setAudioUrl, setIsPreloading, clearItemError, setItemError, setItemLoading, clearAudio]);

  const playQueue = useCallback(async () => {
    if (listeningQueue.length === 0) return;
    const startIndex = currentQueueIndex >= 0 ? currentQueueIndex : 0;
    await playQueueItem(startIndex);
  }, [listeningQueue.length, currentQueueIndex, playQueueItem]);

  const playNextInQueue = useCallback(async () => {
    console.log('⏭️ Auto-playing next in queue:', {
      currentIndex: currentQueueIndex,
      queueLength: listeningQueue.length
    });
    
    const nextIndex = currentQueueIndex + 1;
    if (nextIndex >= listeningQueue.length) {
      console.log('🏁 End of queue reached, stopping playback');
      stopQueuePlayback();
      return;
    }
    
    console.log('▶️ Auto-advancing to index:', nextIndex);
    setIsMaximized(true);
    
    try {
      await playQueueItem(nextIndex);
    } catch (error) {
      console.error('❌ Error auto-playing next item:', error);
    }
  }, [currentQueueIndex, listeningQueue.length, stopQueuePlayback, setIsMaximized, playQueueItem]);

  const retryCurrentItem = useCallback(async () => {
    console.log('🔄 Retrying current queue item:', {
      currentIndex: currentQueueIndex,
      queueLength: listeningQueue.length,
      isQueuePlaying
    });
    
    if (currentQueueIndex < 0 || currentQueueIndex >= listeningQueue.length) {
      console.log('⚠️ Cannot retry: invalid queue index');
      return;
    }
    
    const item = listeningQueue[currentQueueIndex];
    if (!item) {
      console.log('⚠️ Cannot retry: no item found at current index');
      return;
    }
    
    console.log('🔄 Retrying item:', { id: item.id, title: item.title, hasError: !!item.error });
    
    try {
      // Clear the error state before retrying
      clearItemError(item.id);
      await playQueueItem(currentQueueIndex);
      console.log('✅ Retry successful');
    } catch (error) {
      console.error('❌ Retry failed:', error);
      // Error state will be set by playQueueItem's catch block
    }
  }, [currentQueueIndex, listeningQueue, isQueuePlaying, playQueueItem, clearItemError]);

  const handleControlsPlayPause = useCallback(async () => {
    console.log('🎮 Play/Pause button clicked:', {
      queueLength: listeningQueue.length,
      isQueuePlaying,
      isPlaying,
      currentQueueIndex
    });
    
    // If no items in queue, nothing to do
    if (listeningQueue.length === 0) {
      console.log('⚠️ No items in queue, cannot play');
      return;
    }

    // If queue is not playing yet, start it
    if (!isQueuePlaying) {
      console.log('🎮 Starting queue playback');
      setIsMaximized(true);
      await playQueue();
      return;
    }

    // If queue is playing, toggle play/pause of current audio
    if (audioRef.current) {
      try {
        if (isPlaying) {
          console.log('⏸️ Pausing audio');
          audioRef.current.pause();
        } else {
          console.log('▶️ Resuming audio playback');
          await audioRef.current.play();
        }
      } catch (error) {
        console.error('❌ Error toggling playback:', error);
        
        // If there's a playback error, try to regenerate the audio
        if (currentQueueIndex >= 0 && currentQueueIndex < listeningQueue.length) {
          console.log('🔄 Playback error, attempting to regenerate audio...');
          await playQueueItem(currentQueueIndex);
        }
      }
    }
  }, [listeningQueue, isQueuePlaying, isPlaying, audioRef, setIsMaximized, playQueue, currentQueueIndex, playQueueItem]);

  const handleControlsPrevious = useCallback(async () => {
    console.log('⏮️ Previous button clicked:', {
      isQueuePlaying,
      currentQueueIndex,
      queueLength: listeningQueue.length,
      canGoPrevious: currentQueueIndex > 0
    });
    
    if (!isQueuePlaying) {
      console.log('❌ Cannot go previous: queue not playing');
      return;
    }
    
    if (currentQueueIndex <= 0) {
      console.log('❌ Cannot go previous: already at first item');
      return;
    }
    
    const prevIndex = currentQueueIndex - 1;
    console.log('▶️ Moving to previous item at index:', prevIndex);
    
    try {
      await playQueueItem(prevIndex);
    } catch (error) {
      console.error('❌ Error playing previous item:', error);
    }
  }, [isQueuePlaying, currentQueueIndex, listeningQueue.length, playQueueItem]);

  const handleControlsNext = useCallback(async () => {
    console.log('⏭️ Next button clicked:', {
      isQueuePlaying,
      currentQueueIndex,
      queueLength: listeningQueue.length,
      canGoNext: currentQueueIndex < listeningQueue.length - 1
    });
    
    if (!isQueuePlaying) {
      console.log('❌ Cannot go next: queue not playing');
      return;
    }
    
    if (currentQueueIndex >= listeningQueue.length - 1) {
      console.log('❌ Cannot go next: already at last item');
      return;
    }
    
    const nextIndex = currentQueueIndex + 1;
    console.log('▶️ Moving to next item at index:', nextIndex);
    
    try {
      await playQueueItem(nextIndex);
    } catch (error) {
      console.error('❌ Error playing next item:', error);
    }
  }, [isQueuePlaying, currentQueueIndex, listeningQueue.length, playQueueItem]);

  const handleControlsShuffle = useCallback(() => {
    setControlsShuffle(prev => !prev);
  }, []);

  const handleControlsRepeat = useCallback(() => {
    setControlsRepeat(prev => !prev);
  }, []);

  const formatControlsTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Update controls state based on audio state
  useEffect(() => {
    const id = setTimeout(() => {
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
    return () => clearTimeout(id);
  }, [isQueuePlaying, currentTime, duration, isPlaying, audioRef]);

  // Clean up queue when empty
  useEffect(() => {
    console.log('🧹 Queue cleanup effect triggered:', {
      queueLength: listeningQueue.length,
      isQueuePlaying
    });
    
    if (listeningQueue.length === 0 && isQueuePlaying) {
      console.log('🧹 Queue is empty but still playing, stopping playback');
      stopQueuePlayback();
    }
  }, [listeningQueue.length, isQueuePlaying, stopQueuePlayback]);

  // Auto-play next item when current item ends
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    
    const handleAudioEnd = () => {
      console.log('🎵 Audio ended, checking if should play next');
      if (isQueuePlaying) {
        console.log('🎵 Auto-playing next item in queue');
        playNextInQueue();
      }
    };
    
    audioElement.addEventListener('ended', handleAudioEnd);
    return () => audioElement.removeEventListener('ended', handleAudioEnd);
  }, [isQueuePlaying, playNextInQueue, audioRef]);

  return (
    <QueueContext.Provider
      value={{
        listeningQueue,
        currentQueueIndex,
        isQueuePlaying,
        controlsPlaying,
        controlsProgress,
        controlsCurrentTime,
        controlsShuffle,
        controlsRepeat,
        lastKnownContent,
        addToQueue,
        removeFromQueue,
        clearQueue,
        isInQueue,
        playQueue,
        stopQueuePlayback,
        playNextInQueue,
        retryCurrentItem,
        handleControlsPlayPause,
        handleControlsPrevious,
        handleControlsNext,
        handleControlsShuffle,
        handleControlsRepeat,
        formatControlsTime
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};
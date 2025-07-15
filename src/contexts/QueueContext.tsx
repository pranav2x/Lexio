"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { generateSpeech, cleanupAudioUrl, estimateTextDuration } from '@/lib/tts';
import { useLexioState } from '@/lib/store';
import { useAudio } from './AudioContext';

interface QueueItem {
  id: string;
  title: string;
  content: string;
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
    setCurrentWordIndex,
    setWordsData,
    setAudioUrl,
    clearAudio,
    generateWordTimings
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
      console.error('❌ Attempted to add queue item with no content:', item);
      return;
    }
    
    // Validate required fields
    if (!item.id || !item.title) {
      console.error('❌ Queue item missing required fields:', item);
      return;
    }
    
    console.log('✅ Adding to queue:', {
      id: item.id,
      title: item.title,
      contentLength: item.content.length,
      contentPreview: item.content.substring(0, 100) + (item.content.length > 100 ? '...' : '')
    });
    
    setListeningQueue(prev => {
      // Check if item already exists
      if (prev.find(qItem => qItem.id === item.id)) {
        console.log('ℹ️ Item already in queue:', item.id);
        return prev;
      }
      
      const newQueue = [...prev, item];
      console.log('📝 Queue updated, new length:', newQueue.length);
      return newQueue;
    });
  }, []);

  const stopQueuePlayback = useCallback(() => {
    console.log('🛑 stopQueuePlayback called - this will clear audio!');
    
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
    setIsPreloading(false);
  }, [audioRef, clearAudio, setIsPreloading, setCurrentPlayingText, setCurrentPlayingSection, setCurrentWordIndex, setWordsData]);

  const removeFromQueue = useCallback((id: string) => {
    setListeningQueue(prev => {
      const newQueue = prev.filter(item => item.id !== id);
      if (newQueue.length === 0) stopQueuePlayback();
      return newQueue;
    });
  }, [stopQueuePlayback]);

  const clearQueue = useCallback(() => {
    stopQueuePlayback();
    setListeningQueue([]);
  }, [stopQueuePlayback]);

  const playQueueItem = useCallback(async (index: number) => {
    if (index < 0 || index >= listeningQueue.length) {
      console.error('❌ Invalid queue index:', index, 'Queue length:', listeningQueue.length);
      return;
    }
    
    const item = listeningQueue[index];
    
    // Debug logging to understand the issue
    console.log('🎵 Playing queue item:', {
      index,
      id: item.id,
      title: item.title,
      contentLength: item.content?.length || 0,
      hasContent: Boolean(item.content && item.content.trim().length > 0)
    });
    
    // Validate content before proceeding
    if (!item.content || item.content.trim().length === 0) {
      console.error('❌ Queue item has no content:', item);
      setIsPreloading(false);
      return;
    }
    
    // Clean up current audio properly
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Clean up the old audio URL
      if (audioRef.current.src) {
        cleanupAudioUrl(audioRef.current.src);
        audioRef.current.src = '';
      }
    }
    
    // Reset all audio-related state
    setAudioUrl(null);
    setCurrentWordIndex(-1);
    setWordsData([]);
    setIsPreloading(true);
    setControlsPlaying(false);
    setControlsProgress(0);
    setControlsCurrentTime(0);
    
    // Set up new item - ensure state is set synchronously
    setIsQueuePlaying(true);
    setCurrentQueueIndex(index);
    setCurrentPlayingSection(item.id as any);
    
    console.log('🔍 Setting currentPlayingText:', {
      contentLength: item.content.length,
      contentPreview: item.content.substring(0, 100) + '...'
    });
    
    // Set the text content first and backup
    setCurrentPlayingText(item.content);
    setLastKnownContent(item.content); // Backup to prevent content loss
    
    try {
      // Generate initial placeholder word timings for immediate display
      const estimatedDuration = estimateTextDuration(item.content);
      const initialTimings = generateWordTimings(item.content, estimatedDuration);
      setWordsData(initialTimings);
      
      console.log('🗣️ Generating speech for content length:', item.content.length);
      
      // Generate audio
      const result = await generateSpeech(item.content, {}, selectedVoiceId);
      
      if (!result.audioUrl) {
        throw new Error("No audio URL generated");
      }
      
      console.log('✅ Audio generated successfully');
      
      // Set the new audio URL
      setAudioUrl(result.audioUrl);
      
      // Wait for the audio element to update
      if (audioRef.current) {
        audioRef.current.src = result.audioUrl;
        audioRef.current.load();
        
        // Handle metadata loading to update word timings with actual duration
        const handleLoadedMetadata = () => {
          if (audioRef.current && audioRef.current.duration) {
            console.log('📏 Audio loaded, duration:', audioRef.current.duration);
            const actualTimings = generateWordTimings(item.content, audioRef.current.duration);
            setWordsData(actualTimings);
          }
        };
        
        const handleCanPlay = async () => {
          setIsPreloading(false);
          try {
            await audioRef.current!.play();
            setControlsPlaying(true);
            console.log('▶️ Playback started successfully');
          } catch (playError) {
            console.error('❌ Error starting playback:', playError);
            setControlsPlaying(false);
            setIsPreloading(false);
          }
        };
        
        // Add event listeners
        audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
        audioRef.current.addEventListener('canplay', handleCanPlay, { once: true });
        
        // Set up error handling
        audioRef.current.addEventListener('error', (e) => {
          console.error('❌ Audio error:', e);
          setIsPreloading(false);
          setControlsPlaying(false);
        }, { once: true });
      }
      
    } catch (error) {
      console.error('❌ Error generating/playing audio:', error);
      setIsPreloading(false);
      setControlsPlaying(false);
      
      // Don't stop the entire queue, just this item failed
      // But make sure the text is still displayed even if audio fails
      const estimatedDuration = estimateTextDuration(item.content);
      const fallbackTimings = generateWordTimings(item.content, estimatedDuration);
      setWordsData(fallbackTimings);
    }
  }, [listeningQueue, selectedVoiceId, audioRef, setIsQueuePlaying, setCurrentQueueIndex, setCurrentPlayingText, setCurrentPlayingSection, setCurrentWordIndex, setWordsData, setAudioUrl, setIsPreloading, setControlsPlaying, generateWordTimings]);

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

  const handleControlsPlayPause = useCallback(async () => {
    console.log('🎮 handleControlsPlayPause called:', {
      queueLength: listeningQueue.length,
      isQueuePlaying,
      isPlaying
    });
    
    if (listeningQueue.length === 0) return;

    if (!isQueuePlaying) {
      console.log('🎮 Starting queue playback');
      setIsMaximized(true);
      await playQueue();
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        console.log('🎮 Pausing audio');
        audioRef.current.pause();
      } else {
        console.log('🎮 Playing audio');
        try {
          await audioRef.current.play();
        } catch {
          setControlsPlaying(false);
        }
      }
    }
  }, [listeningQueue.length, isQueuePlaying, isPlaying, audioRef, setIsMaximized, playQueue]);

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
  }, [isQueuePlaying, currentTime, duration, isPlaying]);

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
  }, [isQueuePlaying, playNextInQueue]);

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
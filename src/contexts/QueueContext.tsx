"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { generateSpeechWithTimings, cleanupAudioUrl } from '@/lib/tts';
import { useLexioState } from '@/lib/store';
import { useAudio } from './AudioContext';

type PlayingSection = 'summary' | `section-${number}` | null;

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

  const playQueueItem = useCallback(async (index: number) => {
    if (index < 0 || index >= listeningQueue.length) {
      console.error('Invalid queue index:', index, 'Queue length:', listeningQueue.length);
      return;
    }
    
    const item = listeningQueue[index];
    
    console.log('🎯 Playing queue item with enhanced sequence:', {
      index,
      id: item.id,
      title: item.title,
      contentLength: item.content?.length || 0,
      hasContent: Boolean(item.content && item.content.trim().length > 0)
    });
    
    // Validate content before proceeding
    if (!item.content || item.content.trim().length === 0) {
      console.error('Queue item has no content:', item);
      return;
    }
    
    // Step 1: Set loading state immediately
    console.log('🔥 Step 1: Setting loading state');
    setIsPreloading(true);
    
    // Step 2: Immediately set text content and backup (critical for UI consistency)
    console.log('🔥 Step 2: Setting text content immediately:', {
      contentLength: item.content.length,
      contentPreview: item.content.substring(0, 100) + '...'
    });
    setCurrentPlayingText(item.content);
    setLastKnownContent(item.content); // Backup to prevent "No content available" flashing
    
    // Set queue state
    setIsQueuePlaying(true);
    setCurrentQueueIndex(index);
    setCurrentPlayingSection(item.id as PlayingSection);
    
    // Step 3: Clean up previous audio using clearAudio
    console.log('🔥 Step 3: Cleaning up previous audio');
    clearAudio(); // This clears audioUrl, words, and pauses current audio
    
    // Reset controls state
    setControlsPlaying(false);
    setControlsProgress(0);
    setControlsCurrentTime(0);
    
    try {
      // Step 4: Generate new speech audio
      console.log('🔥 Step 4: Generating speech audio for content length:', item.content.length);
      console.log('Item details:', { id: item.id, title: item.title, voiceId: selectedVoiceId });
      
      const result = await generateSpeechWithTimings(item.content, {}, selectedVoiceId);
      
      if (!result.audioUrl) {
        throw new Error("No audio URL generated");
      }
      
      console.log('✅ Audio generated successfully');
      
      // Set real word timings from ElevenLabs if available
      if (result.wordTimings && result.wordTimings.length > 0) {
        console.log('🎯 Setting real word timings from ElevenLabs:', {
          wordTimingsCount: result.wordTimings.length,
          firstWord: result.wordTimings[0]?.text,
          lastWord: result.wordTimings[result.wordTimings.length - 1]?.text
        });
        const wordData = result.wordTimings.map((timing) => ({
          text: timing.text,
          start: timing.start,
          end: timing.end
        }));
        setWords(wordData);
      } else {
        console.log('⚠️ No word timings from ElevenLabs - will use fallback generation when audio loads');
        // Don't set empty words here - let AudioContext generate fallback timings
      }
      
      // Step 5: Set the new audioUrl (AudioContext will handle loading via useEffect)
      console.log('🔥 Step 5: Setting new audio URL - AudioContext will handle loading');
      setAudioUrl(result.audioUrl);
      
      // Step 6: Wait for audio to load and then begin playback
      console.log('🔥 Step 6: Waiting for audio to load and begin playback');
      
      if (audioRef.current) {
        // AudioContext will handle loading via onLoadedData event
        // We just need to wait for canplay and then start playback
        await new Promise<void>((resolve, reject) => {
          const audio = audioRef.current!;
          let timeoutId: NodeJS.Timeout;
          
          const onCanPlay = () => {
            console.log('✅ Audio can play - stopping preloading and starting playback');
            clearTimeout(timeoutId);
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            
            setIsPreloading(false);
            
            // Start playback
            audio.play()
              .then(() => {
                setControlsPlaying(true);
                console.log('✅ Playback started successfully');
                resolve();
              })
              .catch((playError) => {
                console.error('❌ Play failed:', playError);
                setControlsPlaying(false);
                reject(playError);
              });
          };
          
          const onError = (e: Event) => {
            console.error('❌ Audio loading error:', e);
            clearTimeout(timeoutId);
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            setIsPreloading(false);
            reject(new Error('Audio loading failed'));
          };
          
          // Set up event listeners
          audio.addEventListener('canplay', onCanPlay, { once: true });
          audio.addEventListener('error', onError, { once: true });
          
          // Timeout after 30 seconds
          timeoutId = setTimeout(() => {
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            setIsPreloading(false);
            reject(new Error('Audio loading timeout'));
          }, 30000);
          
          // If already ready, trigger immediately
          if (audio.readyState >= 4) {
            onCanPlay();
          }
        });
      } else {
        console.error('❌ No audio element available');
        setIsPreloading(false);
        throw new Error('No audio element available');
      }
      
    } catch (error) {
      console.error('❌ Error generating audio:', error);
      setIsPreloading(false);
      setControlsPlaying(false);
      
      // Provide more detailed error information
      let errorMessage = 'Unknown error';
      let errorCode = '';
      let shouldRetry = false;
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check for specific error types
        if (errorMessage.includes('429') || errorMessage.includes('too_many_concurrent_requests')) {
          errorMessage = 'Rate limit exceeded. Too many requests in progress.';
          errorCode = '429';
          shouldRetry = true;
        } else if (errorMessage.includes('401') || errorMessage.includes('invalid_api_key')) {
          errorMessage = 'Invalid API key. Please check your ElevenLabs API key configuration.';
          errorCode = '401';
        } else if (errorMessage.includes('500')) {
          errorMessage = 'Server error. Please try again.';
          errorCode = '500';
          shouldRetry = true;
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection.';
          shouldRetry = true;
        }
      }
      
      console.error('❌ TTS Generation failed:', {
        error: errorMessage,
        errorCode,
        shouldRetry,
        itemId: item.id,
        contentLength: item.content.length,
        selectedVoiceId,
        fullError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });
      
      // Don't stop the entire queue, just this item failed
      // But make sure the text is still displayed even if audio fails
      setWords([]);
      
      // Set a basic fallback state so the UI still shows content
      if (audioRef.current) {
        // Clear any existing audio
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        if (audioRef.current.src) {
          cleanupAudioUrl(audioRef.current.src);
          audioRef.current.removeAttribute('src');
        }
      }
      
      // Keep the text content visible even if audio generation failed
      setCurrentPlayingText(item.content);
      setLastKnownContent(item.content);
      
      // For rate limit errors, show a user-friendly message
      if (errorCode === '429') {
        console.warn('⏰ Rate limit hit. Audio will be available when requests settle.');
      }
      
      // Set the audio URL to null and ensure preloading is stopped
      setAudioUrl(null);
      setIsPreloading(false);
      
      // Don't throw - let the UI show the content even without audio
      console.log('⚠️ Continuing with text-only mode due to TTS error:', {
        timestamp: new Date().toISOString(),
        itemId: item.id,
        currentPlayingTextLength: item.content.length,
        lastKnownContentLength: item.content.length,
        wordsSet: false,
        errorType: errorCode,
        shouldRetry
      });
      
      // For retryable errors, we could add an auto-retry mechanism here
      if (shouldRetry && errorCode === '429') {
        console.log('🔄 Will allow manual retry for rate limit error');
      }
    }
  }, [listeningQueue, selectedVoiceId, audioRef, setIsQueuePlaying, setCurrentQueueIndex, setCurrentPlayingText, setCurrentPlayingSection, setWords, setAudioUrl, setIsPreloading, setControlsPlaying]);

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
    
    if (!isQueuePlaying || currentQueueIndex < 0 || currentQueueIndex >= listeningQueue.length) {
      console.log('⚠️ Cannot retry: invalid queue state');
      return;
    }
    
    try {
      await playQueueItem(currentQueueIndex);
      console.log('✅ Retry successful');
    } catch (error) {
      console.error('❌ Retry failed:', error);
    }
  }, [currentQueueIndex, listeningQueue.length, isQueuePlaying, playQueueItem]);

  const handleControlsPlayPause = useCallback(async () => {
    console.log('🎮🔥 PLAY BUTTON CLICKED - handleControlsPlayPause called:', {
      timestamp: new Date().toISOString(),
      queueLength: listeningQueue.length,
      isQueuePlaying,
      isPlaying,
      currentQueueIndex,
      audioRefCurrent: !!audioRef.current,
      audioSrc: audioRef.current?.src || 'No source',
      audioReadyState: audioRef.current?.readyState || 'No audio element',
      queueItems: listeningQueue.map(item => ({ 
        id: item.id, 
        title: item.title, 
        contentLength: item.content?.length || 0,
        hasContent: Boolean(item.content && item.content.trim().length > 0)
      }))
    });
    
    // If no items in queue, nothing to do
    if (listeningQueue.length === 0) {
      console.log('⚠️🔥 No items in queue, cannot play');
      return;
    }

    // If queue is not playing yet, start it
    if (!isQueuePlaying) {
      console.log('🎮🔥 Starting queue playback - isQueuePlaying is false');
      console.log('🎮🔥 Queue contents:', listeningQueue.map(item => ({ id: item.id, title: item.title, contentLength: item.content?.length })));
      setIsMaximized(true);
      console.log('🎮🔥 About to call playQueue()...');
      try {
        await playQueue();
        console.log('✅🔥 playQueue() completed successfully');
      } catch (error) {
        console.error('❌🔥 Error in playQueue():', error);
      }
      return;
    }

    // If queue is playing but no valid audio, retry current item
    if (isQueuePlaying && (!audioRef.current?.src || audioRef.current.src === 'null' || audioRef.current.src === '')) {
      console.log('🔄 Retrying current queue item due to missing audio');
      const validIndex = Math.max(0, currentQueueIndex);
      if (validIndex < listeningQueue.length) {
        try {
          await playQueueItem(validIndex);
          return;
        } catch (error) {
          console.error('❌ Error retrying queue item:', error);
        }
      }
    }

    // If queue is playing, toggle play/pause of current audio
    if (audioRef.current) {
      try {
        if (isPlaying) {
          console.log('⏸️ Pausing audio');
          audioRef.current.pause();
          setControlsPlaying(false);
        } else {
          console.log('▶️ Resuming audio playback');
          
          // Check if audio element has a valid source
          if (!audioRef.current.src || audioRef.current.src === 'null' || audioRef.current.src === '') {
            console.log('⚠️ No valid audio source, regenerating...');
            // If no valid source, try to play the current queue item again
            const validIndex = Math.max(0, currentQueueIndex);
            if (validIndex < listeningQueue.length) {
              await playQueueItem(validIndex);
              return;
            }
          }
          
          // Check if audio is ready to play
          if (audioRef.current.readyState < 2) {
            console.log('⏳ Audio not ready, waiting for load...');
            setIsPreloading(true);
            
            // Wait for audio to load
            await new Promise((resolve, reject) => {
              const audio = audioRef.current!;
              const timeout = setTimeout(() => {
                reject(new Error('Audio load timeout'));
              }, 10000); // 10 second timeout
              
              const onLoadedData = () => {
                clearTimeout(timeout);
                audio.removeEventListener('loadeddata', onLoadedData);
                audio.removeEventListener('error', onError);
                resolve(void 0);
              };
              
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const onError = (e: any) => {
                clearTimeout(timeout);
                audio.removeEventListener('loadeddata', onLoadedData);
                audio.removeEventListener('error', onError);
                reject(e);
              };
              
              audio.addEventListener('loadeddata', onLoadedData);
              audio.addEventListener('error', onError);
              
              // If already loaded
              if (audio.readyState >= 2) {
                clearTimeout(timeout);
                resolve(void 0);
              }
            });
            
            setIsPreloading(false);
          }
          
          console.log('🔍 Audio element details before play:', {
            src: audioRef.current.src,
            readyState: audioRef.current.readyState,
            duration: audioRef.current.duration,
            currentTime: audioRef.current.currentTime,
            paused: audioRef.current.paused
          });
          
          await audioRef.current.play();
          setControlsPlaying(true);
          console.log('✅ Audio play() call succeeded');
        }
      } catch (error) {
        console.error('❌ Error toggling playback:', error);
        console.error('❌ Error details:', {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          name: (error as any).name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          message: (error as any).message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code: (error as any).code
        });
        setControlsPlaying(false);
        setIsPreloading(false);
        
        // If there's a playback error, try to regenerate the audio
        if (!isPlaying && currentQueueIndex >= 0 && currentQueueIndex < listeningQueue.length) {
          console.log('🔄 Playback error, attempting to regenerate audio...');
          try {
            await playQueueItem(currentQueueIndex);
          } catch (retryError) {
            console.error('❌ Retry also failed:', retryError);
          }
        }
      }
    } else {
      console.log('⚠️ No audio element available, creating new one...');
      // If no audio element, try to start queue again
      try {
        await playQueue();
      } catch (error) {
        console.error('❌ Error restarting queue:', error);
      }
    }
  }, [listeningQueue, isQueuePlaying, isPlaying, audioRef, setIsMaximized, playQueue, currentQueueIndex, setControlsPlaying, setIsPreloading, playQueueItem]);

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
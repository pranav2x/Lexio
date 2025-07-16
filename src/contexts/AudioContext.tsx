"use client";

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { generateSpeech, cleanupAudioUrl, getTTSCacheStats } from '@/lib/tts';
import { useLexioState } from '@/lib/store';
import { useWordSync, WordData } from '@/hooks/useWordSync';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cacheStats: any;
  generateAudioForSection: (sectionType: PlayingSection, customText?: string) => Promise<void>;
  playSectionDirectly: (sectionId: string, content: string) => Promise<void>;
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
  handleClearCache: () => void;
  formatTime: (seconds: number) => string;
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
  const [currentPlayingSection, setCurrentPlayingSection] = useState<PlayingSection>(null);
  const [currentPlayingText, setCurrentPlayingText] = useState('');
  const [words, setWords] = useState<WordData[]>([]);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTransitioning] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cacheStats, setCacheStats] = useState<any>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Use the simplified word sync hook
  const { currentWordIndex } = useWordSync({
    audioRef,
    words
  });

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

  const generateAudioForSection = useCallback(async (sectionType: PlayingSection, customText?: string) => {
    console.log('🎯 generateAudioForSection called:', { sectionType, customTextLength: customText?.length });
    
    if (!sectionType) {
      console.error('❌ No sectionType provided');
      return;
    }
    
    if (!customText) {
      console.warn('generateAudioForSection called without customText - this should use the queue system');
      return;
    }
    
    setIsGeneratingAudio(true);
    setAudioError(null);
    setCurrentPlayingSection(sectionType);
    
    // Clear words immediately to prevent stale highlighting
    setWords([]);
    
    try {
      setCurrentPlayingText(customText);
      
      const result = await generateSpeech(customText, {}, selectedVoiceId);
      console.log('✅ generateSpeech completed:', { 
        audioUrl: !!result.audioUrl, 
        wordTimingsCount: result.wordTimings?.length 
      });
      
      setAudioUrl(result.audioUrl);
      
      // Use real word timings from ElevenLabs
      if (result.wordTimings && result.wordTimings.length > 0) {
        console.log('🎯 Using real word timings from ElevenLabs:', result.wordTimings.length, 'words');
        const wordData: WordData[] = result.wordTimings.map((timing) => ({
          text: timing.text,
          start: timing.start,
          end: timing.end
        }));
        setWords(wordData);
      } else {
        console.log('🎯 No word timings available from ElevenLabs');
        setWords([]);
      }
      
      if (process.env.NODE_ENV === 'development') setCacheStats(getTTSCacheStats());
    } catch (err) {
      console.error('❌ generateAudioForSection error:', err);
      setAudioError('Failed to generate audio.');
      setCurrentPlayingSection(null);
      setCurrentPlayingText('');
      setWords([]);
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [selectedVoiceId]);

  const handlePlayPause = useCallback(() => {
    console.log('🎵 handlePlayPause called:', { 
      hasAudioRef: !!audioRef.current, 
      hasAudioUrl: !!audioUrl, 
      isPlaying
    });
    
    if (!audioRef.current || !audioUrl) {
      console.error('❌ Cannot play: missing audioRef or audioUrl');
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error('❌ Audio play error:', error);
      });
    }
  }, [audioUrl, isPlaying]);

  const handleStop = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setCurrentPlayingSection(null);
    setCurrentPlayingText('');
    setWords([]);
    if (audioUrl) cleanupAudioUrl(audioUrl);
    setAudioUrl(null);
  }, [audioUrl]);

  const handleSeek = useCallback((newTime: number) => {
    if (audioRef.current) audioRef.current.currentTime = newTime;
  }, []);

  const handleWordClick = useCallback((index: number) => {
    const word = words[index];
    if (!word || !audioRef.current) return;
    audioRef.current.currentTime = word.start;
  }, [words]);

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
    setWords([]);
    setIsPlaying(false);
  }, [audioUrl]);

  // New function for direct play from ContentCard (moved from ContentCard.tsx)
  const playSectionDirectly = useCallback(async (sectionId: string, content: string) => {
    console.log('🎯 Direct play called for:', { sectionId, contentLength: content.length });
    
    if (!content || content.trim().length === 0) {
      console.error('❌ No content to play');
      return;
    }

    try {
      // Clear any existing audio first
      clearAudio();
      
      console.log('🎯 Starting direct audio generation...');
      await generateAudioForSection(sectionId as PlayingSection, content);
      console.log('✅ Audio generation completed, starting playback...');
      
      // Start playing immediately after generation
      setTimeout(() => {
        handlePlayPause();
      }, 200);
    } catch (error) {
      console.error('❌ Error in direct play:', error);
    }
  }, [generateAudioForSection, clearAudio, handlePlayPause]);

  const handleClearCache = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      import('@/lib/tts').then(async ({ clearTTSCache }) => {
        const success = await clearTTSCache();
        if (success) setCacheStats(getTTSCacheStats());
      });
    }
  }, []);

  const formatTime = useCallback((s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`, []);

  // Audio event handlers
  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;
    const audio = audioRef.current;
    const setDur = () => setDuration(audio.duration);
    const syncTime = () => setCurrentTime(audio.currentTime);
    audio.addEventListener('loadedmetadata', setDur);
    audio.addEventListener('timeupdate', syncTime);
    return () => {
      audio.removeEventListener('loadedmetadata', setDur);
      audio.removeEventListener('timeupdate', syncTime);
    };
  }, [audioUrl]);

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
      words,
      isMaximized,
      isTransitioning,
      isPreloading,
      cacheStats,
      generateAudioForSection,
      playSectionDirectly,
      handlePlayPause,
      handleStop,
      handleSeek,
      handleWordClick,
      handleSpeedChange,
      setIsMaximized,
      setIsPreloading,
      setCurrentPlayingSection,
      setCurrentPlayingText: wrappedSetCurrentPlayingText,
      setWords,
      setAudioUrl,
      clearAudio,
      handleClearCache,
      formatTime,
    }}>
      {children}
      {/* Always render audio element to keep ref stable */}
      <audio
        ref={audioRef}
        src={audioUrl ?? undefined} // Use undefined to remove the attribute when audioUrl is null
        preload="auto"
        onPlay={() => {
          console.log('Audio element: onPlay event fired');
          setIsPlaying(true);
        }}
        onPause={() => {
          console.log('Audio element: onPause event fired');
          setIsPlaying(false);
        }}
        onLoadedData={() => {
          console.log('Audio element: onLoadedData fired, duration:', audioRef.current?.duration);
          if (audioRef.current) {
            const audioDuration = audioRef.current.duration;
            setDuration(audioDuration);
            
            // Generate word timings if we don't have real ones from ElevenLabs
            if (currentPlayingText && words.length === 0 && audioDuration > 0) {
              console.log('🎯 No real word timings available, generating intelligent fallback timings');
              // This fallback logic is no longer needed as we rely on API word timings
              // const generatedTimings = generateWordTimings(currentPlayingText, audioDuration);
              // if (generatedTimings.length > 0) {
              //   setWords(generatedTimings);
              //   console.log('✅ Fallback word timings set:', generatedTimings.length, 'words');
              // }
            }
          }
        }}
        onCanPlay={() => {
          // Automatically play when new audio is ready
          console.log('Audio element: onCanPlay fired - ready for automatic playback');
          if (audioRef.current && audioUrl && !isPlaying) {
            audioRef.current.play().catch(e => console.error("Auto-play failed", e));
          }
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onError={(e) => {
          console.error('Audio element: onError fired', e);
          setAudioError('Audio playback failed');
          setIsPlaying(false);
        }}
        onEnded={() => {
          // This will be used for auto-playing the next item in the queue
          console.log('AudioContext: onEnded event fired');
          setIsPlaying(false);
          setCurrentTime(0);
          // The QueueContext will listen for this and trigger the next item
        }}
      />
    </AudioContext.Provider>
  );
};

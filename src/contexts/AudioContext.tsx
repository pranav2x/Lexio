"use client";

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { generateSpeechWithTimings, cleanupAudioUrl, getTTSCacheStats } from '@/lib/tts';
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
  generateWordTimings: (text: string, audioDuration: number) => WordData[];
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

  // Intelligent word timing generation function
  const generateWordTimings = useCallback((text: string, audioDuration: number): WordData[] => {
    if (!text || audioDuration <= 0) return [];
    
    console.log('🎯 generateWordTimings called:', { textLength: text.length, audioDuration });
    
    // Split text into words and whitespace, preserving structure
    const tokens = text.split(/(\s+|[.!?]+|[,;:]+)/);
    const words = tokens.filter(token => token.trim().length > 0 && !/^\s+$/.test(token));
    
    if (words.length === 0) return [];
    
    // Calculate timing parameters
    const startBuffer = audioDuration * 0.04; // 4% silence at start
    const endBuffer = audioDuration * 0.02; // 2% buffer at end
    const totalSpeechTime = audioDuration - startBuffer - endBuffer;
    
    // Calculate base timing per character (more accurate than per word)
    const totalCharacters = words.reduce((sum, word) => sum + word.length, 0);
    const baseTimePerChar = totalSpeechTime / Math.max(totalCharacters, 1);
    
    // Calculate pause durations
    const punctuationPauses = new Map([
      ['.', 0.6], ['!', 0.6], ['?', 0.7], // Long pauses
      [',', 0.25], [';', 0.3], [':',  0.35], // Medium pauses
      ['default', 0.1] // Short pause between words
    ]);
    
    const wordTimings: WordData[] = [];
    let currentTime = startBuffer;
    
    words.forEach((word, index) => {
      // Calculate word duration based on length and complexity
      let wordDuration = word.length * baseTimePerChar;
      
      // Adjust for word complexity
      if (word.length > 12) wordDuration *= 1.3; // Very long words
      else if (word.length > 8) wordDuration *= 1.15; // Long words
      else if (word.length < 3) wordDuration *= 0.85; // Short words
      
      // Adjust for word patterns
      if (/^[A-Z][a-z]+$/.test(word)) wordDuration *= 1.1; // Proper nouns
      if (/\d+/.test(word)) wordDuration *= 1.2; // Numbers
      if (/[A-Z]{2,}/.test(word)) wordDuration *= 1.4; // Acronyms
      
      // Create word timing
      const wordTiming: WordData = {
        text: word,
        start: currentTime,
        end: currentTime + wordDuration
      };
      
      wordTimings.push(wordTiming);
      currentTime += wordDuration;
      
      // Add pause after word based on punctuation
      if (index < words.length - 1) { // Don't add pause after last word
        let pauseDuration = punctuationPauses.get('default')!;
        
        // Check for punctuation at end of word
        const lastChar = word[word.length - 1];
        if (punctuationPauses.has(lastChar)) {
          pauseDuration = punctuationPauses.get(lastChar)!;
        }
        
        // Add natural breathing pauses for long sentences
        if (index > 0 && index % 15 === 0) pauseDuration += 0.2;
        
        currentTime += pauseDuration;
      }
    });
    
    // Normalize timings to fit exactly within audio duration
    const actualTotalTime = currentTime;
    const expectedTotalTime = audioDuration - endBuffer;
    const scaleFactor = expectedTotalTime / actualTotalTime;
    
    const normalizedTimings = wordTimings.map(timing => ({
      ...timing,
      start: startBuffer + (timing.start - startBuffer) * scaleFactor,
      end: startBuffer + (timing.end - startBuffer) * scaleFactor
    }));
    
    console.log('✅ generateWordTimings completed:', {
      wordsGenerated: normalizedTimings.length,
      totalDuration: audioDuration,
      lastWordEnd: normalizedTimings[normalizedTimings.length - 1]?.end,
      scaleFactor: scaleFactor.toFixed(3)
    });
    
    return normalizedTimings;
  }, []);

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
      
      const result = await generateSpeechWithTimings(customText, {}, selectedVoiceId);
      console.log('✅ generateSpeechWithTimings completed:', { 
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

  const handleClearCache = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      import('@/lib/tts').then(({ clearTTSCache }) => {
        if (clearTTSCache()) setCacheStats(getTTSCacheStats());
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
      generateWordTimings,
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
      {/* Always render audio element so ref is available */}
      <audio
        ref={audioRef}
        src={audioUrl || ''}
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
              const generatedTimings = generateWordTimings(currentPlayingText, audioDuration);
              if (generatedTimings.length > 0) {
                setWords(generatedTimings);
                console.log('✅ Fallback word timings set:', generatedTimings.length, 'words');
              }
            }
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
          console.log('Audio element: onEnded fired');
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />
    </AudioContext.Provider>
  );
};

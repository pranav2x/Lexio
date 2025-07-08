"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLexioState, useLexioActions } from "@/lib/store";
import { extractSummary } from "@/lib/firecrawl";
import { generateSpeech, cleanupAudioUrl, estimateTextDuration } from "@/lib/tts";

interface WordData {
  word: string;
  index: number;
  startTime: number;
  endTime: number;
  isWhitespace: boolean;
}

type PlayingSection = 'summary' | 'full' | `section-${number}` | null;

export default function ReadPage() {
  const router = useRouter();
  const { scrapedData, currentUrl } = useLexioState();
  const { clearAll } = useLexioActions();
  
  // Audio state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [wordsData, setWordsData] = useState<WordData[]>([]);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  // Section-specific playback state
  const [currentPlayingSection, setCurrentPlayingSection] = useState<PlayingSection>(null);
  const [currentPlayingText, setCurrentPlayingText] = useState<string>('');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const highlightedWordRef = useRef<HTMLSpanElement>(null);

  // Generate word timing data based on text and audio duration with improved accuracy
  const generateWordTimings = useCallback((text: string, audioDuration: number): WordData[] => {
    const words = text.split(/(\s+)/);
    const nonWhitespaceWords = words.filter(word => word.trim() !== '');
    const totalWords = nonWhitespaceWords.length;
    
    // More realistic speech rates: average 150-200 words per minute
    const estimatedSpeechRate = Math.max(120, Math.min(totalWords / (audioDuration / 60), 200));
    const baseWordDuration = 60 / estimatedSpeechRate; // seconds per word
    
    let currentTime = 0;
    const wordTimings: WordData[] = [];
    
    words.forEach((word, index) => {
      const isWhitespace = word.trim() === '';
      
      if (isWhitespace) {
        // Small pause for whitespace
        const pauseDuration = word.includes('\n') ? 0.3 : 0.1;
        wordTimings.push({
          word,
          index,
          startTime: currentTime,
          endTime: currentTime + pauseDuration,
          isWhitespace: true,
        });
        currentTime += pauseDuration;
      } else {
        // Calculate word duration based on various factors
        let wordDuration = baseWordDuration;
        
        // Adjust for word length (longer words take more time)
        const wordLength = word.length;
        if (wordLength > 10) wordDuration *= 1.4;
        else if (wordLength > 7) wordDuration *= 1.2;
        else if (wordLength > 4) wordDuration *= 1.1;
        else if (wordLength <= 2) wordDuration *= 0.8;
        
        // Adjust for punctuation (pauses after sentences)
        if (/[.!?]$/.test(word)) wordDuration *= 1.5; // Sentence endings
        else if (/[,;:]$/.test(word)) wordDuration *= 1.2; // Clause endings
        
        // Adjust for complexity (technical terms, numbers, etc.)
        if (/\d/.test(word)) wordDuration *= 1.3; // Numbers
        if (/[A-Z]{2,}/.test(word)) wordDuration *= 1.2; // Acronyms
        
        wordTimings.push({
          word,
          index,
          startTime: currentTime,
          endTime: currentTime + wordDuration,
          isWhitespace: false,
        });
        
        currentTime += wordDuration;
      }
    });
    
    // Normalize timings to match actual audio duration
    const totalCalculatedTime = currentTime;
    const scaleFactor = audioDuration / totalCalculatedTime;
    
    wordTimings.forEach(timing => {
      timing.startTime *= scaleFactor;
      timing.endTime *= scaleFactor;
    });
    
    return wordTimings;
  }, []);

  // Find current word based on audio time
  const findCurrentWordIndex = useCallback((currentTime: number): number => {
    if (wordsData.length === 0) return -1;
    
    for (let i = 0; i < wordsData.length; i++) {
      const word = wordsData[i];
      if (!word.isWhitespace && currentTime >= word.startTime && currentTime <= word.endTime) {
        return i;
      }
    }
    
    // If not found, find the closest word
    let closestIndex = -1;
    let closestDistance = Infinity;
    
    wordsData.forEach((word, index) => {
      if (!word.isWhitespace) {
        const distance = Math.abs(word.startTime - currentTime);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      }
    });
    
    return closestIndex;
  }, [wordsData]);

  // Auto-scroll to current word
  const scrollToCurrentWord = useCallback(() => {
    if (highlightedWordRef.current && contentRef.current) {
      const wordElement = highlightedWordRef.current;
      const container = contentRef.current;
      
      // Get the position of the word relative to the container
      const wordRect = wordElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Calculate if we need to scroll
      const wordTop = wordRect.top - containerRect.top;
      const wordBottom = wordRect.bottom - containerRect.top;
      const containerHeight = containerRect.height;
      
      // Only scroll if the word is not visible or near the edges
      if (wordTop < 100 || wordBottom > containerHeight - 100) {
        wordElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, []);

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
      } else if (sectionType === 'full') {
        textToSpeak = scrapedData.cleanText || scrapedData.text;
        // If still too long, use summary instead
        if (textToSpeak.length > 5000) {
          textToSpeak = extractSummary(textToSpeak, 1000);
        }
      } else if (sectionType.startsWith('section-')) {
        const sectionIndex = parseInt(sectionType.replace('section-', ''));
        const section = scrapedData.sections[sectionIndex];
        if (section) {
          textToSpeak = section.content;
        }
      }

      setCurrentPlayingText(textToSpeak);
      const result = await generateSpeech(textToSpeak);
      setAudioUrl(result.audioUrl);
    } catch (error) {
      console.error('Failed to generate audio:', error);
      setAudioError(error instanceof Error ? error.message : 'Failed to generate audio');
      setCurrentPlayingSection(null);
      setCurrentPlayingText('');
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [scrapedData]);

  // Legacy function for backward compatibility
  const generateAudioFromText = useCallback(async () => {
    await generateAudioForSection('summary');
  }, [generateAudioForSection]);

  // Update current word index based on audio time
  useEffect(() => {
    if (isPlaying && wordsData.length > 0) {
      const newWordIndex = findCurrentWordIndex(currentTime);
      if (newWordIndex !== currentWordIndex && newWordIndex !== -1) {
        setCurrentWordIndex(newWordIndex);
      }
    }
  }, [currentTime, isPlaying, wordsData, findCurrentWordIndex, currentWordIndex]);

  // Auto-scroll when current word changes
  useEffect(() => {
    if (currentWordIndex !== -1 && isPlaying) {
      // Small delay to ensure DOM is updated
      setTimeout(scrollToCurrentWord, 100);
    }
  }, [currentWordIndex, isPlaying, scrollToCurrentWord]);

  // Generate word timings when audio loads
  useEffect(() => {
    if (audioRef.current && duration > 0 && currentPlayingText) {
      const timings = generateWordTimings(currentPlayingText, duration);
      setWordsData(timings);
    }
  }, [duration, currentPlayingText, generateWordTimings]);

  // Set playback rate when audio loads
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
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
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleStop = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setCurrentWordIndex(-1);
    setCurrentPlayingSection(null);
    setCurrentPlayingText('');
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
    audioRef.current.playbackRate = newRate;
  };

  // Speed options
  const speedOptions = [0.75, 1, 1.25, 1.5];

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Enhanced text preparation with section-specific highlighting
  const prepareTextForTTS = (text: string, sectionType: PlayingSection) => {
    // Only show highlighting if this section is currently playing and matches the current playing text
    const shouldHighlight = currentPlayingSection === sectionType && 
                           currentPlayingText && 
                           text === currentPlayingText;
    
    const words = text.split(/(\s+)/);
    
    return words.map((word, index) => {
      const isWhitespace = word.trim() === '';
      const isHighlighted = shouldHighlight && currentWordIndex === index;
      
      if (isWhitespace) {
        return word; // Return whitespace as-is
      }
      
      return (
        <span
          key={index}
          ref={isHighlighted ? highlightedWordRef : undefined}
          className={`inline-block cursor-pointer transition-all duration-200 ${
            isHighlighted 
              ? 'bg-yellow-300 dark:bg-yellow-600 text-black dark:text-white px-1 py-0.5 rounded-sm shadow-md scale-105' 
              : shouldHighlight 
                ? 'hover:bg-secondary/50 px-0.5 py-0.5 rounded-sm' 
                : 'px-0.5 py-0.5'
          }`}
          onClick={() => shouldHighlight && handleWordClick(index)}
          title={shouldHighlight ? "Click to jump to this word" : undefined}
        >
          {word}
        </span>
      );
    });
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
    <div className="min-h-screen bg-white text-black [&_*]:text-black">
      {/* Hidden Audio Element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
              // Removed auto-play - user now controls playback
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentWordIndex(-1);
            // Keep the section and text state so user can replay if needed
          }}
          preload="auto"
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground hidden sm:block">
                {currentUrl && new URL(currentUrl).hostname}
              </div>
              <button
                onClick={handleStartOver}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent transition-colors"
              >
                New Site
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Audio Controls */}
      <div className="sticky top-16 z-30 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-4xl mx-auto">
            {isGeneratingAudio && (
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <span className="text-muted-foreground">Generating audio...</span>
              </div>
            )}

            {audioError && (
              <div className="flex items-center justify-center gap-2 mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-red-800 dark:text-red-200 text-sm">{audioError}</span>
                <button
                  onClick={generateAudioFromText}
                  className="text-red-600 hover:text-red-800 text-sm underline ml-2"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Generate Audio Button - Show when no audio is generated yet */}
            {!audioUrl && !isGeneratingAudio && !audioError && (
              <div className="flex items-center justify-center mb-4">
                <button
                  onClick={generateAudioFromText}
                  className="flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  <span>Generate Audio</span>
                </button>
              </div>
            )}

            {audioUrl && !isGeneratingAudio && (
              <div className="space-y-4">
                {/* Play Controls */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={handlePlayPause}
                    disabled={!audioUrl}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                      isPlaying
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isPlaying ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6" />
                        </svg>
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span>Play Audio</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleStop}
                    disabled={!audioUrl}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium bg-secondary text-secondary-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10h6v4H9z" />
                    </svg>
                    <span>Stop</span>
                  </button>

                  <button
                    onClick={generateAudioFromText}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Regenerate</span>
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <div className="relative">
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-200"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      value={currentTime}
                      onChange={(e) => handleSeek(Number(e.target.value))}
                      className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main ref={contentRef} className="container mx-auto px-6 py-8">
        <div className="max-w-[700px] mx-auto">
          {/* Article Header */}
          <div className="mb-8">
            <div className="prose prose-lg prose-gray dark:prose-invert max-w-none">
              <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                {scrapedData.title}
              </h1>
            </div>
            
            {currentUrl && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <a 
                  href={currentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  {currentUrl}
                </a>
              </div>
            )}

            {/* Content Stats */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{scrapedData.text.split(' ').length} words</span>
                {scrapedData.cleanText && scrapedData.cleanText !== scrapedData.text && (
                  <span className="text-blue-600 dark:text-blue-400 text-xs">
                    ({scrapedData.cleanText.split(' ').length} optimized for TTS)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>~{Math.ceil(scrapedData.text.split(' ').length / 200)} min read</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                <span>~{Math.ceil(estimateTextDuration(scrapedData.text) / 60)} min listen</span>
              </div>
              {audioUrl && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12 7-12 6z" />
                  </svg>
                  <span>Audio ready</span>
                </div>
              )}
            </div>
          </div>

          {/* Content Summary */}
          {scrapedData.text && (
            <div className="mb-8">
              <div className="prose prose-lg prose-gray dark:prose-invert max-w-none">
                <h2 className="text-xl font-semibold mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Summary
                  </div>
                  <button
                    onClick={() => generateAudioForSection('summary')}
                    disabled={isGeneratingAudio}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      currentPlayingSection === 'summary'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-accent'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isGeneratingAudio && currentPlayingSection === 'summary' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                    <span className="hidden sm:inline">
                      {currentPlayingSection === 'summary' ? 'Playing' : 'Play Summary'}
                    </span>
                  </button>
                </h2>
                <div className={`bg-card border rounded-lg p-6 ${
                  currentPlayingSection === 'summary' ? 'border-primary bg-primary/5' : 'border-border'
                }`}>
                  <p className="text-muted-foreground leading-relaxed">
                    {prepareTextForTTS(extractSummary(scrapedData.text, 300), 'summary')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sections */}
          {scrapedData.sections.length > 0 && (
            <div className="mb-8">
              <div className="prose prose-lg prose-gray dark:prose-invert max-w-none">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Content Sections
                </h2>
                <div className="space-y-6">
                  {scrapedData.sections.map((section, index) => (
                    <div key={index} className={`bg-card border rounded-lg p-6 ${
                      currentPlayingSection === `section-${index}` ? 'border-primary bg-primary/5' : 'border-border'
                    }`}>
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold text-foreground flex-1">
                          {section.title}
                        </h3>
                        <button
                          onClick={() => generateAudioForSection(`section-${index}` as PlayingSection)}
                          disabled={isGeneratingAudio}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ml-4 ${
                            currentPlayingSection === `section-${index}`
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground hover:bg-accent'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isGeneratingAudio && currentPlayingSection === `section-${index}` ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                          <span className="hidden sm:inline">
                            {currentPlayingSection === `section-${index}` ? 'Playing' : 'Play'}
                          </span>
                        </button>
                      </div>
                      <div className="prose prose-gray dark:prose-invert max-w-none">
                        <p className="text-muted-foreground leading-relaxed">
                          {prepareTextForTTS(section.content, `section-${index}` as PlayingSection)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Full Content */}
          <div className="mb-8">
            <div className="prose prose-lg prose-gray dark:prose-invert max-w-none">
              <h2 className="text-xl font-semibold mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Full Content
                </div>
                <button
                  onClick={() => generateAudioForSection('full')}
                  disabled={isGeneratingAudio}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    currentPlayingSection === 'full'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isGeneratingAudio && currentPlayingSection === 'full' ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                  <span className="hidden sm:inline">
                    {currentPlayingSection === 'full' ? 'Playing' : 'Play Full'}
                  </span>
                </button>
              </h2>
              <div className={`bg-card border rounded-lg p-6 ${
                currentPlayingSection === 'full' ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <div className="text-foreground leading-relaxed">
                    {prepareTextForTTS(scrapedData.text, 'full')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TTS Status */}
          <div className="text-center text-sm text-muted-foreground pb-20">
            <p>
              💡 <strong>Pro tip:</strong> Click any <strong>Play</strong> button to listen to that specific section. 
              Words highlight in <span className="bg-yellow-300 dark:bg-yellow-600 px-1 py-0.5 rounded-sm text-black dark:text-white">yellow</span> as audio plays. 
              Click highlighted words to jump to that position. Page auto-scrolls to keep current word centered.
              {currentPlayingSection && audioUrl ? ` 🎧 Playing ${
                currentPlayingSection === 'summary' ? 'Summary' :
                currentPlayingSection === 'full' ? 'Full Content' :
                currentPlayingSection.startsWith('section-') ? 
                  `Section ${parseInt(currentPlayingSection.replace('section-', '')) + 1}` : 
                  currentPlayingSection
              }!` : ''}
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Audio Control Bar */}
      {audioUrl && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border/40">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col gap-3">
                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground min-w-[3rem] text-right">
                    {formatTime(currentTime)}
                  </span>
                  <div className="flex-1 relative">
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-200"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      />
                    </div>
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
                  <span className="text-xs text-muted-foreground min-w-[3rem]">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  {/* Left Side - Play/Pause/Stop */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePlayPause}
                      disabled={!audioUrl}
                      className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                        isPlaying
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    
                    <button
                      onClick={handleStop}
                      disabled={!audioUrl}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Stop"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10h6v4H9z" />
                      </svg>
                    </button>
                  </div>

                  {/* Center - Current Section and Word Indicator */}
                  <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                    {currentPlayingSection && (
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="font-medium text-xs">
                          Playing: {
                            currentPlayingSection === 'summary' ? 'Summary' :
                            currentPlayingSection === 'full' ? 'Full Content' :
                            currentPlayingSection.startsWith('section-') ? 
                              `Section ${parseInt(currentPlayingSection.replace('section-', '')) + 1}` : 
                              currentPlayingSection
                          }
                        </span>
                      </span>
                    )}
                    {currentWordIndex !== -1 && wordsData[currentWordIndex] && (
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                        <span className="font-medium text-xs">
                          Word {wordsData.filter((word, index) => !word.isWhitespace && index <= currentWordIndex).length} / {wordsData.filter(word => !word.isWhitespace).length}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Right Side - Speed Control */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:block">Speed:</span>
                    <div className="flex items-center gap-1">
                      {speedOptions.map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            playbackRate === speed
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground hover:bg-accent'
                          }`}
                          aria-label={`Set speed to ${speed}x`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
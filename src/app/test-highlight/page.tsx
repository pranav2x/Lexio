"use client";

import React, { useState, useRef, useEffect } from 'react';
import WordHighlighter from '@/components/read/WordHighlighter';

interface WordData {
  word: string;
  index: number;
  startTime: number;
  endTime: number;
  isWhitespace: boolean;
}

export default function TestHighlightPage() {
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const highlightedWordRef = useRef<HTMLSpanElement>(null);
  
  const testText = "This is a test sentence to demonstrate the word highlighting functionality. Each word should be highlighted in sequence to show the TTS synchronization.";
  
  // Generate mock word data
  const generateMockWordData = (text: string): WordData[] => {
    const words = text.split(/(\s+)/);
    const wordTimings: WordData[] = [];
    let currentTime = 0;
    
    words.forEach((word, index) => {
      const isWhitespace = word.trim() === '';
      const duration = isWhitespace ? 0.1 : word.length * 0.1 + 0.3;
      
      wordTimings.push({
        word,
        index,
        startTime: currentTime,
        endTime: currentTime + duration,
        isWhitespace,
      });
      
      currentTime += duration;
    });
    
    return wordTimings;
  };
  
  const wordsData = generateMockWordData(testText);
  
  const handleWordClick = (wordIndex: number) => {
    setCurrentWordIndex(wordIndex);
    console.log(`Clicked word ${wordIndex}: "${wordsData[wordIndex]?.word}"`);
  };
  
  // Auto-advance through words for demo
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentWordIndex((prev) => {
          const nextIndex = prev + 1;
          if (nextIndex >= wordsData.length) {
            setIsPlaying(false);
            return -1;
          }
          return nextIndex;
        });
      }, 500); // Change word every 500ms for demo
      
      return () => clearInterval(interval);
    }
  }, [isPlaying, wordsData.length]);
  
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">Word Highlighting Test</h1>
          <p className="text-white/70">Test the TTS word highlighting functionality</p>
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setIsPlaying(!isPlaying);
                if (!isPlaying) {
                  setCurrentWordIndex(0);
                } else {
                  setCurrentWordIndex(-1);
                }
              }}
              className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-white/90 transition-all"
            >
              {isPlaying ? 'Stop Demo' : 'Start Demo'}
            </button>
            
            <button
              onClick={() => {
                setCurrentWordIndex(-1);
                setIsPlaying(false);
              }}
              className="px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all"
            >
              Reset
            </button>
          </div>
          
          <div className="text-center text-sm text-white/60">
            Current word index: {currentWordIndex} | Playing: {isPlaying ? 'Yes' : 'No'}
            {currentWordIndex >= 0 && wordsData[currentWordIndex] && (
              <> | Current word: &quot;{wordsData[currentWordIndex].word}&quot;</>
            )}
          </div>
        </div>
        
        <div className="glass-card p-8 rounded-xl">
          <h2 className="text-xl font-bold mb-4 text-center">Word Highlighting Demo</h2>
          <WordHighlighter
            wordsData={wordsData}
            currentWordIndex={currentWordIndex}
            isPlaying={isPlaying}
            content={testText}
            onWordClick={handleWordClick}
            highlightedWordRef={highlightedWordRef}
            compact={false}
            textSize="lg"
          />
        </div>
        
        <div className="glass-card p-6 rounded-xl">
          <h3 className="text-lg font-bold mb-4">Features Being Tested:</h3>
          <ul className="space-y-2 text-white/80">
            <li>✅ Real-time word highlighting with animation</li>
            <li>✅ Auto-scroll to highlighted word</li>
            <li>✅ Click-to-seek functionality</li>
            <li>✅ Smooth transitions and hover effects</li>
            <li>✅ Playback speed controls (in main app)</li>
          </ul>
        </div>
        
        <div className="text-center">
          <a 
            href="/read" 
            className="inline-block px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all"
          >
            Back to Main App
          </a>
        </div>
      </div>
    </div>
  );
} 
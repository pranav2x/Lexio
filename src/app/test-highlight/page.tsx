"use client";

import React, { useState } from 'react';

interface WordData {
  word: string;
  index: number;
  startTime: number;
  endTime: number;
}

export default function TestHighlightPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);

  const testText = `Artificial intelligence is transforming the way we live and work. From virtual assistants to autonomous vehicles, AI is becoming an integral part of our daily lives. Machine learning algorithms analyze vast amounts of data to make predictions and recommendations. Natural language processing enables computers to understand and generate human language. Computer vision allows machines to interpret and analyze visual information. As AI continues to evolve, it promises to revolutionize industries and create new possibilities we never imagined.`;

  const wordsData: WordData[] = testText.split(' ').map((word, index) => ({
    word: word.replace(/[.,!?;]/g, ''),
    index,
    startTime: index * 0.5,
    endTime: (index + 1) * 0.5
  }));

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setCurrentWordIndex(0);
    } else {
      setCurrentWordIndex(-1);
    }
  };
  
  // Auto-advance through words for demo
  // useEffect(() => {
  //   if (isPlaying) {
  //     const interval = setInterval(() => {
  //       setCurrentWordIndex((prev) => {
  //         const nextIndex = prev + 1;
  //         if (nextIndex >= wordsData.length) {
  //           setIsPlaying(false);
  //           return -1;
  //         }
  //         return nextIndex;
  //       });
  //     }, 500); // Change word every 500ms for demo
      
  //     return () => clearInterval(interval);
  //   }
  // }, [isPlaying, wordsData.length]);
  
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
              onClick={togglePlayback}
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
          {/* WordHighlighter component was removed, so this section is now empty */}
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
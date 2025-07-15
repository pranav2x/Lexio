"use client";

import React, { useState } from 'react';
import AudioHighlighter from '@/components/AudioHighlighter';
import Link from 'next/link';

const sampleTexts = [
  {
    title: "Ancient Trade Networks",
    content: "Trade networks expanded dramatically during the period 1200-1450, connecting Europe, Asia, and Africa in complex commercial relationships. The Silk Road continued as the primary overland trade route, reaching peak efficiency under Mongol protection through the Pax Mongolica. Maritime trade in the Indian Ocean basin flourished, linking East Africa, the Middle East, India, Southeast Asia, and China."
  },
  {
    title: "Renaissance Innovation",
    content: "The Renaissance period from 1300 to 1600 CE marked a revolutionary era of artistic, cultural, and scientific advancement in Europe. Artists like Leonardo da Vinci and Michelangelo transformed visual arts, while inventors and scholars pushed the boundaries of human knowledge. The printing press revolutionized the spread of information, democratizing access to books and ideas across European society."
  },
  {
    title: "Maritime Exploration",
    content: "European maritime exploration in the 15th and 16th centuries opened new trade routes and connected distant continents. Portuguese navigators like Vasco da Gama sailed around Africa to reach Asia, while Christopher Columbus's voyages brought Europeans to the Americas. These expeditions fundamentally altered global commerce, cultural exchange, and the balance of world power."
  }
];

export default function AudioHighlighterDemo() {
  const [selectedText, setSelectedText] = useState(sampleTexts[0]);
  const [customText, setCustomText] = useState('');
  const [useCustomText, setUseCustomText] = useState(false);

  const currentContent = useCustomText && customText.trim() ? customText : selectedText.content;
  const currentTitle = useCustomText ? "Custom Content" : selectedText.title;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 font-mono-enhanced">
              🎵 Enhanced Audio Highlighter Demo
            </h1>
            <p className="text-white/70 font-mono-enhanced">
              Real-time word highlighting with integrated voice selection and secure TTS
            </p>
          </div>
          <Link 
            href="/read"
            className="glass-card px-4 py-2 rounded-lg text-white hover:bg-white/10 transition-all duration-200 font-mono-enhanced"
          >
            ← Back to Reader
          </Link>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Content Selection */}
          <div className="glass-card p-6 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-4 font-mono-enhanced">📝 Choose Content</h2>
            
            {/* Sample Texts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {sampleTexts.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedText(sample);
                    setUseCustomText(false);
                  }}
                  className={`text-left p-4 rounded-lg border transition-all duration-200 hover:scale-[1.02] ${
                    !useCustomText && selectedText === sample
                      ? 'border-white/40 bg-white/10 text-white'
                      : 'border-white/20 bg-white/5 text-white/80 hover:border-white/30'
                  }`}
                >
                  <div className="font-semibold text-sm font-mono-enhanced mb-1">{sample.title}</div>
                  <div className="text-xs text-white/60 line-clamp-3 font-mono-enhanced">
                    {sample.content}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Text Input */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useCustom"
                  checked={useCustomText}
                  onChange={(e) => setUseCustomText(e.target.checked)}
                  className="rounded bg-white/10 border-white/20"
                />
                <label htmlFor="useCustom" className="text-sm font-semibold text-white font-mono-enhanced">
                  Use Custom Text
                </label>
              </div>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Enter your own text to convert to speech..."
                className="w-full h-24 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 resize-none focus:outline-none focus:border-white/40 font-mono-enhanced"
                disabled={!useCustomText}
              />
            </div>
          </div>

          {/* Features Overview */}
          <div className="glass-card p-6 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-4 font-mono-enhanced">✨ Enhanced Features</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: "🗣️", label: "Voice Selection", desc: "Integrated voice picker" },
                { icon: "🔒", label: "Secure API", desc: "Server-side TTS keys" },
                { icon: "🎯", label: "Word Sync", desc: "Real-time highlighting" },
                { icon: "🎛️", label: "Full Controls", desc: "Timeline & speed" },
                { icon: "📱", label: "Touch Friendly", desc: "Mobile optimized" },
                { icon: "🎨", label: "Clean Design", desc: "Black & white theme" },
                { icon: "⚡", label: "Fast Loading", desc: "Efficient caching" },
                { icon: "🔄", label: "Auto-scroll", desc: "Follows playback" }
              ].map((feature, index) => (
                <div key={index} className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-2xl mb-2">{feature.icon}</div>
                  <div className="font-semibold text-white text-sm font-mono-enhanced">{feature.label}</div>
                  <div className="text-xs text-white/60 font-mono-enhanced">{feature.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Demo */}
          <div className="glass-card rounded-xl overflow-hidden">
            <AudioHighlighter
              key={`${useCustomText ? 'custom' : selectedText.title}`} // Re-mount on content change
              content={currentContent}
              title={currentTitle}
              queueInfo="Enhanced Demo Mode"
            />
          </div>

          {/* Integration Guide */}
          <div className="glass-card p-6 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-4 font-mono-enhanced">🔗 Integration Benefits</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-white mb-2 font-mono-enhanced">✅ Uses Existing Infrastructure</h3>
                  <ul className="text-sm text-white/80 space-y-1 font-mono-enhanced">
                    <li>• VoiceSelector component integration</li>
                    <li>• Secure /api/tts endpoint</li>
                    <li>• Global voice state management</li>
                    <li>• Development caching system</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2 font-mono-enhanced">🎨 Design Consistency</h3>
                  <ul className="text-sm text-white/80 space-y-1 font-mono-enhanced">
                    <li>• Black & white aesthetic</li>
                    <li>• Glass card styling</li>
                    <li>• Consistent typography</li>
                    <li>• Hover effects and animations</li>
                  </ul>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-white mb-2 font-mono-enhanced">⚡ Performance Features</h3>
                  <ul className="text-sm text-white/80 space-y-1 font-mono-enhanced">
                    <li>• Efficient word timing algorithm</li>
                    <li>• Smooth 50ms update intervals</li>
                    <li>• Proper cleanup and memory management</li>
                    <li>• Responsive timeline seeking</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2 font-mono-enhanced">🛠️ Developer Experience</h3>
                  <ul className="text-sm text-white/80 space-y-1 font-mono-enhanced">
                    <li>• Simple component API</li>
                    <li>• TypeScript type safety</li>
                    <li>• Configurable props</li>
                    <li>• Error handling included</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Example */}
          <div className="glass-card p-6 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-4 font-mono-enhanced">📝 Usage Example</h2>
            <div className="bg-black/50 p-4 rounded-lg border border-white/10">
              <pre className="text-white/80 text-sm font-mono overflow-x-auto">
{`import AudioHighlighter from '@/components/AudioHighlighter';

// Basic usage with default content
<AudioHighlighter />

// Custom content and title  
<AudioHighlighter
  content="Your article content here..."
  title="Article Title"
  queueInfo="1 of 3 in queue"
/>

// Full-screen reading mode
<AudioHighlighter
  content={article.content}
  title={article.title}
  queueInfo={\`\${currentIndex + 1} of \${totalArticles}\`}
  className="h-screen"
/>`}
              </pre>
            </div>
          </div>

          {/* Technical Details */}
          <div className="glass-card p-6 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-4 font-mono-enhanced">🔧 How It Works</h2>
            <div className="space-y-4 text-white/80 font-mono-enhanced">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-white mb-2">1. Voice & TTS Integration</h3>
                  <p className="text-sm">Reads selectedVoiceId from global state and calls your secure /api/tts endpoint with the chosen voice.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">2. Smart Word Timing</h3>
                  <p className="text-sm">Analyzes text structure, word lengths, and punctuation to create natural speech timing estimates.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">3. Real-time Synchronization</h3>
                  <p className="text-sm">Updates highlighting every 50ms using precise audio currentTime tracking for smooth visual feedback.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">4. Interactive Timeline</h3>
                  <p className="text-sm">Click anywhere on the progress bar to seek, with automatic word highlighting adjustment.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="text-center">
            <div className="flex gap-4 justify-center">
              <Link 
                href="/"
                className="px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all font-mono-enhanced"
              >
                ← Home
              </Link>
              <Link 
                href="/read"
                className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-white/90 transition-all font-mono-enhanced"
              >
                Try Full Reader →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
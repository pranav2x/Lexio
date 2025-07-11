"use client";

import { useState, useRef, useEffect } from "react";
import { VOICE_OPTIONS, VoiceOption } from "@/lib/tts";
import { useLexioState, useLexioActions } from "@/lib/store";

interface DropdownPosition {
  horizontal: 'left' | 'right' | 'center';
  vertical: 'below' | 'above';
  maxHeight: number;
}

export default function VoiceSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({
    horizontal: 'left',
    vertical: 'below',
    maxHeight: 280
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { selectedVoiceId } = useLexioState();
  const { setSelectedVoiceId } = useLexioActions();

  const selectedVoice = VOICE_OPTIONS.find(voice => voice.id === selectedVoiceId) || VOICE_OPTIONS[0];

  const handleVoiceSelect = (voice: VoiceOption) => {
    setSelectedVoiceId(voice.id);
    setIsOpen(false);
  };

  // Calculate optimal dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 288; // w-72 = 288px
      const dropdownHeight = 280; // Estimated dropdown height
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Calculate horizontal position
      let horizontal: 'left' | 'right' | 'center' = 'left';
      const spaceOnRight = viewportWidth - buttonRect.right;
      const spaceOnLeft = buttonRect.left;
      
      if (spaceOnRight < dropdownWidth && spaceOnLeft > dropdownWidth) {
        horizontal = 'right';
      } else if (spaceOnRight < dropdownWidth && spaceOnLeft < dropdownWidth) {
        // Center the dropdown if both sides don't have enough space
        horizontal = 'center';
      }
      
      // Calculate vertical position
      let vertical: 'below' | 'above' = 'below';
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      
      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        vertical = 'above';
      }
      
      // Calculate max height based on available space
      let maxHeight = vertical === 'below' 
        ? Math.min(280, spaceBelow - 20) 
        : Math.min(280, spaceAbove - 20);
      
      // If the calculated max height is too small, try the opposite direction
      if (maxHeight < 250) {
        const oppositeSpace = vertical === 'below' ? spaceAbove : spaceBelow;
        if (oppositeSpace > maxHeight + 50) {
          vertical = vertical === 'below' ? 'above' : 'below';
          maxHeight = Math.min(280, oppositeSpace - 20);
        }
      }
      
      setDropdownPosition({
        horizontal,
        vertical,
        maxHeight: Math.max(200, maxHeight) // Minimum height of 200px
      });
    }
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 2px;
          transition: background 0.15s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
        }
      `}</style>
      
      {/* Voice Selector Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 glass-card px-3 py-2 rounded-lg transition-all duration-200 hover:bg-white/5 hover:border-white/20 group"
        aria-label="Select voice"
      >
        <svg className="w-4 h-4 text-white/70 group-hover:text-white/90 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 006 0v-5a3 3 0 00-6 0v5z" />
        </svg>
        <span className="text-sm font-medium text-white/80 group-hover:text-white font-mono-enhanced hidden sm:block">
          {selectedVoice.name}
        </span>
        <svg 
          className={`w-3 h-3 text-white/50 transition-all duration-200 group-hover:text-white/70 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div 
            ref={dropdownRef}
            className={`absolute w-72 glass-card rounded-lg border border-white/15 backdrop-blur-xl z-50 shadow-2xl shadow-black/30 ${
              dropdownPosition.vertical === 'below' ? 'top-full mt-1' : 'bottom-full mb-1'
            } ${
              dropdownPosition.horizontal === 'left' ? 'left-0' : 
              dropdownPosition.horizontal === 'right' ? 'right-0' : 
              'left-1/2 transform -translate-x-1/2'
            } animate-in fade-in-0 slide-in-from-top-2 duration-200`}
            style={{ 
              maxHeight: `${dropdownPosition.maxHeight}px`
            }}
          >
            <div className="p-2">
              <div className="text-xs font-medium text-white/60 mb-2 px-2 font-mono-enhanced uppercase tracking-wide">
                Voice Selection
              </div>
              
              {/* Voice Grid */}
              <div 
                className="space-y-0.5 overflow-y-auto custom-scrollbar"
                style={{ maxHeight: `${dropdownPosition.maxHeight - 60}px` }}
              >
                {VOICE_OPTIONS.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => handleVoiceSelect(voice)}
                    className={`w-full text-left px-3 py-2.5 rounded-md transition-all duration-150 font-mono-enhanced group relative ${
                      voice.id === selectedVoiceId
                        ? 'bg-white/15 text-white border-l-2 border-white/60'
                        : 'hover:bg-white/8 text-white/75 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-sm">{voice.name}</span>
                          <div className="flex gap-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded text-center min-w-[20px] ${
                              voice.gender === 'female' 
                                ? 'bg-pink-500/20 text-pink-300' 
                                : 'bg-blue-500/20 text-blue-300'
                            }`}>
                              {voice.gender === 'female' ? '♀' : '♂'}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono">
                              {voice.accent.slice(0, 3).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-white/50 truncate">{voice.description}</div>
                      </div>
                      {voice.id === selectedVoiceId && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full ml-2 shrink-0"></div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 
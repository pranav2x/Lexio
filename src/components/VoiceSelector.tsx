"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { VOICE_OPTIONS, VoiceOption } from "@/lib/tts";
import { useLexioState, useLexioActions } from "@/lib/store";



export default function VoiceSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { selectedVoiceId } = useLexioState();
  const { setSelectedVoiceId } = useLexioActions();

  const selectedVoice = VOICE_OPTIONS.find(voice => voice.id === selectedVoiceId) || VOICE_OPTIONS[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleVoiceSelect = (voice: VoiceOption) => {
    setSelectedVoiceId(voice.id);
    setIsOpen(false);
  };

  // Position dropdown with better viewport awareness
  useEffect(() => {
    if (isOpen && buttonRef.current && dropdownRef.current && mounted) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 280;
      const dropdownWidth = 320;
      
      // Calculate available space
      const spaceAbove = buttonRect.top;
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      
      // Determine vertical position (prefer above for audio player)
      const shouldOpenAbove = spaceAbove >= dropdownHeight + 16;
      
      // Determine horizontal position
      let left = buttonRect.left;
      if (left + dropdownWidth > window.innerWidth) {
        left = buttonRect.right - dropdownWidth;
      }
      if (left < 16) {
        left = 16;
      }
      
      // Calculate top position
      let top: number;
      if (shouldOpenAbove) {
        top = buttonRect.top - dropdownHeight - 8;
      } else {
        top = buttonRect.bottom + 8;
      }
      
      // Ensure dropdown stays within viewport
      if (top < 16) {
        top = 16;
      } else if (top + dropdownHeight > window.innerHeight - 16) {
        top = window.innerHeight - dropdownHeight - 16;
      }
      
      dropdownRef.current.style.top = `${top}px`;
      dropdownRef.current.style.left = `${left}px`;
      dropdownRef.current.style.width = `${dropdownWidth}px`;
      dropdownRef.current.style.maxHeight = `${dropdownHeight}px`;
      
      setDropdownPosition(prev => ({
        ...prev,
        vertical: shouldOpenAbove ? 'above' : 'below',
        maxHeight: dropdownHeight,
      }));

      // Debug logging
      console.log('Dropdown positioning:', {
        buttonRect,
        dropdownTop: top,
        dropdownLeft: left,
        dropdownHeight,
        dropdownWidth,
        spaceAbove,
        spaceBelow,
        shouldOpenAbove,
        position: shouldOpenAbove ? 'above' : 'below',
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      });
    }
  }, [isOpen, mounted]);

  const renderDropdown = () => {
    if (!isOpen || !mounted) return null;

    return createPortal(
      <>
        {/* Transparent backdrop */}
        <div 
          className="fixed inset-0 z-[999999]" 
          onClick={() => {
            console.log('Backdrop clicked, closing dropdown');
            setIsOpen(false);
          }}
        />
        
        {/* Transparent dropdown that goes UP */}
        <div 
          ref={dropdownRef}
          className="fixed bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl z-[999999] shadow-lg"
          style={{ 
            // Position will be set by useEffect
          }}
        >
          <div className="p-3">
            {/* Transparent voice selection with minimal disturbance */}
            <div className="space-y-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: '240px' }}>
              {VOICE_OPTIONS.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => {
                    console.log('Voice selected:', voice.name);
                    handleVoiceSelect(voice);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 font-mono-enhanced ${
                    voice.id === selectedVoiceId
                      ? 'bg-white/20 text-white/95 border border-white/40'
                      : 'text-white/60 hover:bg-white/10 hover:text-white/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm opacity-80">{voice.name}</span>
                        <div className="flex gap-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded opacity-70 ${
                            voice.gender === 'female' 
                              ? 'bg-pink-500/30 text-pink-200' 
                              : 'bg-blue-500/30 text-blue-200'
                          }`}>
                            {voice.gender === 'female' ? '♀' : '♂'}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono opacity-70">
                            {voice.accent.slice(0, 3).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-white/40 truncate opacity-60">
                        {voice.description}
                      </div>
                    </div>
                    {voice.id === selectedVoiceId && (
                      <div className="w-2 h-2 bg-white/80 rounded-full ml-2 shrink-0"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </>,
      document.body
    );
  };

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
      
      {/* Enhanced Voice Selector Button - More Prominent */}
      <button
        ref={buttonRef}
        onClick={() => {
          console.log('Voice selector clicked, isOpen will be:', !isOpen);
          setIsOpen(!isOpen);
        }}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 font-mono-enhanced hover:scale-105 min-w-[120px] ${
          isOpen
            ? 'bg-white text-black shadow-lg neon-glow'
            : 'bg-white/10 text-white/90 border border-white/30 hover:bg-white/20 hover:text-white hover:border-white/50'
        }`}
        aria-label="Select voice"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 006 0v-5a3 3 0 00-6 0v5z" />
        </svg>
        <span className="font-bold truncate flex-1 text-left">
          {selectedVoice.name}
        </span>
        <svg 
          className={`w-3 h-3 flex-shrink-0 transition-all duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Render dropdown using portal */}
      {renderDropdown()}
    </div>
  );
}
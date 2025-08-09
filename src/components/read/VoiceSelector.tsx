"use client";

import React, { useState, useEffect } from 'react';
import { ChevronDown, Volume2, Play, Pause } from 'lucide-react';

interface Voice {
  voice_id: string;
  name: string;
  gender: string;
  accent: string;
  description: string;
  preview_url?: string;
}

interface VoiceSelectorProps {
  selectedVoiceId: string;
  onVoiceChange: (voiceId: string) => void;
  selectedSpeed?: number;
  className?: string;
}

export function VoiceSelector({ selectedVoiceId, onVoiceChange, selectedSpeed = 1.0, className = '' }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  useEffect(() => {
    fetchVoices();
    
    // Cleanup audio on unmount
    return () => {
      if (previewAudio) {
        previewAudio.pause();
        previewAudio.src = '';
      }
    };
  }, []);

  const fetchVoices = async () => {
    try {
      const response = await fetch('/api/elevenlabs-voices');
      const data = await response.json();
      
      if (data.voices) {
        setVoices(data.voices);
      }
    } catch (error) {
      console.error('Failed to fetch voices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceSelect = (voiceId: string) => {
    onVoiceChange(voiceId);
    setIsOpen(false);
    
    // Stop any playing preview
    if (previewAudio) {
      previewAudio.pause();
      setPlayingVoiceId(null);
    }
  };

  const playPreview = async (voice: Voice, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // If no preview URL, generate a quick sample
    if (!voice.preview_url) {
      try {
        const response = await fetch('/api/elevenlabs-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: "Hello! This is a preview of my voice. How do I sound?",
            voiceId: voice.voice_id,
            speed: selectedSpeed
          }),
        });
        
        if (response.ok) {
          const { audio } = await response.json();
          const audioBlob = new Blob(
            [Uint8Array.from(atob(audio), c => c.charCodeAt(0))], 
            { type: 'audio/mpeg' }
          );
          const audioUrl = URL.createObjectURL(audioBlob);
          
          // Stop current audio if playing
          if (previewAudio) {
            previewAudio.pause();
          }
          
          const newAudio = new Audio(audioUrl);
          newAudio.onended = () => setPlayingVoiceId(null);
          newAudio.onpause = () => setPlayingVoiceId(null);
          
          setPreviewAudio(newAudio);
          setPlayingVoiceId(voice.voice_id);
          newAudio.play();
        }
      } catch (error) {
        console.error('Failed to generate preview:', error);
      }
    }
  };

  const stopPreview = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (previewAudio) {
      previewAudio.pause();
      setPlayingVoiceId(null);
    }
  };

  const getGenderIcon = (gender: string) => {
    switch (gender.toLowerCase()) {
      case 'male': return '♂';
      case 'female': return '♀';
      default: return '◊';
    }
  };

  const getAccentFlag = (accent: string) => {
    switch (accent.toLowerCase()) {
      case 'american': return '🇺🇸';
      case 'british': return '🇬🇧';
      case 'australian': return '🇦🇺';
      case 'canadian': return '🇨🇦';
      default: return '🌍';
    }
  };

  if (loading) {
    return (
      <div className={`w-80 h-11 bg-black border border-white/20 rounded-lg animate-pulse ${className}`} />
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-80 bg-black hover:bg-white/10 text-white px-4 py-3 rounded-lg border border-white/20 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          <span className="truncate">Voices</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full left-0 mt-1 w-80 bg-black border border-white/20 rounded-lg shadow-xl z-20 max-h-80 overflow-y-auto">
            {voices.map((voice) => (
              <div
                key={voice.voice_id}
                onClick={() => handleVoiceSelect(voice.voice_id)}
                className={`p-3 hover:bg-white/10 cursor-pointer border-b border-white/10 last:border-b-0 transition-colors ${
                  voice.voice_id === selectedVoiceId ? 'bg-white/10' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white truncate">
                        {voice.name}
                      </span>
                      <span className="text-xs text-white/60 flex items-center gap-1">
                        {getGenderIcon(voice.gender)} {getAccentFlag(voice.accent)}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 line-clamp-2">
                      {voice.description}
                    </p>
                  </div>
                  
                  {/* Preview Button */}
                  <button
                    onClick={playingVoiceId === voice.voice_id ? stopPreview : (e) => playPreview(voice, e)}
                    className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
                    title={playingVoiceId === voice.voice_id ? "Stop preview" : "Play preview"}
                  >
                    {playingVoiceId === voice.voice_id ? (
                      <Pause className="w-3 h-3 text-white" />
                    ) : (
                      <Play className="w-3 h-3 text-white" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 
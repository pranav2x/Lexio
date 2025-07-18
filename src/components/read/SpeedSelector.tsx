"use client";

import React, { useState } from 'react';
import { ChevronDown, Gauge } from 'lucide-react';

interface SpeedOption {
  value: number;
  label: string;
  description: string;
}

interface SpeedSelectorProps {
  selectedSpeed: number;
  onSpeedChange: (speed: number) => void;
  className?: string;
}

const SPEED_OPTIONS: SpeedOption[] = [
  {
    value: 0.7,
    label: '0.7x',
    description: 'Slower speed'
  },
  {
    value: 0.85,
    label: '0.85x',
    description: 'Slightly slower'
  },
  {
    value: 1.0,
    label: '1x',
    description: 'Normal speed'
  },
  {
    value: 1.1,
    label: '1.1x',
    description: 'Slightly faster'
  },
  {
    value: 1.2,
    label: '1.2x',
    description: 'Faster reading'
  }
];

export function SpeedSelector({ selectedSpeed, onSpeedChange, className = '' }: SpeedSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = SPEED_OPTIONS.find(option => option.value === selectedSpeed);

  const handleSpeedSelect = (speed: number) => {
    onSpeedChange(speed);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-32 bg-black hover:bg-white/10 text-white px-4 py-3 rounded-lg border border-white/20 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4" />
          <span className="truncate">
            {selectedOption ? selectedOption.label : '1x'}
          </span>
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
          <div className="absolute top-full left-0 mt-1 w-32 bg-black border border-white/20 rounded-lg shadow-xl z-20">
            {SPEED_OPTIONS.map((option) => (
              <div
                key={option.value}
                onClick={() => handleSpeedSelect(option.value)}
                className={`p-3 hover:bg-white/10 cursor-pointer border-b border-white/10 last:border-b-0 transition-colors ${
                  option.value === selectedSpeed ? 'bg-white/10' : ''
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-white text-sm">
                    {option.label}
                  </span>
                  <span className="text-xs text-white/60">
                    {option.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 
// components/features/music/InstrumentSelector.tsx

import React from 'react';
import { Music, Piano, Guitar, Drum, Music2, Mic, Radio, Headphones, CheckCircle } from 'lucide-react';

interface InstrumentSelectorProps {
  selectedInstruments: string[];
  onInstrumentToggle: (instrument: string) => void;
  maxInstruments?: number;
}

const InstrumentSelector: React.FC<InstrumentSelectorProps> = ({
  selectedInstruments,
  onInstrumentToggle,
  maxInstruments = 4,
}) => {
  const instruments = [
    { id: 'piano', name: 'Piano', icon: Piano, emoji: '🎹', gradient: 'from-blue-400 to-indigo-500' },
    { id: 'guitar', name: 'Guitar', icon: Guitar, emoji: '🎸', gradient: 'from-orange-400 to-red-500' },
    { id: 'drums', name: 'Drums', icon: Drum, emoji: '🥁', gradient: 'from-pink-400 to-rose-500' },
    { id: 'violin', name: 'Violin', icon: Music2, emoji: '🎻', gradient: 'from-purple-400 to-violet-500' },
    { id: 'bass', name: 'Bass', icon: Headphones, emoji: '🎺', gradient: 'from-green-400 to-teal-500' },
    { id: 'synth', name: 'Synthesizer', icon: Radio, emoji: '🎛️', gradient: 'from-cyan-400 to-blue-500' },
    { id: 'flute', name: 'Flute', icon: Mic, emoji: '🎵', gradient: 'from-amber-400 to-yellow-500' },
    { id: 'cello', name: 'Cello', icon: Music, emoji: '🎻', gradient: 'from-slate-400 to-gray-500' },
  ];

  const handleToggle = (instrumentId: string) => {
    if (selectedInstruments.includes(instrumentId)) {
      onInstrumentToggle(instrumentId);
    } else if (selectedInstruments.length < maxInstruments) {
      onInstrumentToggle(instrumentId);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-violet-600" />
          <h4 className="text-lg font-semibold text-gray-900">Select Instruments</h4>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {Array.from({ length: maxInstruments }).map((_, i) => (
              <div
                key={i}
                className={`
                  w-2 h-2 rounded-full transition-all duration-300
                  ${i < selectedInstruments.length
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 scale-110'
                    : 'bg-gray-300'
                  }
                `}
              />
            ))}
          </div>
          <span className="text-sm font-medium bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            {selectedInstruments.length}/{maxInstruments}
          </span>
        </div>
      </div>

      {/* Instruments Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {instruments.map((instrument) => {
          const isSelected = selectedInstruments.includes(instrument.id);
          const canSelect = selectedInstruments.length < maxInstruments || isSelected;
          const Icon = instrument.icon;

          return (
            <button
              key={instrument.id}
              onClick={() => handleToggle(instrument.id)}
              disabled={!canSelect}
              className={`
                relative group p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105
                ${isSelected
                  ? 'border-violet-400 bg-gradient-to-br from-violet-50 to-purple-50 shadow-lg scale-105'
                  : canSelect
                  ? 'border-gray-200 bg-white hover:border-violet-300 hover:shadow-md hover:bg-gradient-to-br hover:from-violet-50/50 hover:to-purple-50/50'
                  : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed hover:scale-100'
                }
              `}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 z-10">
                  <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              )}

              {/* Emoji & Icon */}
              <div className="relative mb-3">
                <div className="text-3xl mb-2">{instrument.emoji}</div>
                <div className={`
                  absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-br ${instrument.gradient}
                  rounded-lg flex items-center justify-center transform rotate-12 group-hover:rotate-0 transition-transform
                  ${!canSelect ? 'opacity-50' : ''}
                `}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </div>

              {/* Name */}
              <span className={`
                text-sm font-medium transition-colors
                ${isSelected ? 'text-violet-700' : canSelect ? 'text-gray-700' : 'text-gray-400'}
              `}>
                {instrument.name}
              </span>

              {/* Hover effect gradient */}
              {canSelect && !isSelected && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-600/0 to-purple-600/0 group-hover:from-violet-600/5 group-hover:to-purple-600/5 transition-all duration-300 pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>

      {/* Status Messages */}
      {selectedInstruments.length === 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-sm text-blue-700 font-medium">
            🎵 Select up to {maxInstruments} instruments for your composition
          </p>
        </div>
      )}

      {selectedInstruments.length === maxInstruments && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-sm text-green-700 font-medium">
            ✨ Perfect! Maximum instruments selected. Deselect one to change your selection.
          </p>
        </div>
      )}

      {/* Selected Instruments Preview */}
      {selectedInstruments.length > 0 && selectedInstruments.length < maxInstruments && (
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4">
          <p className="text-xs font-medium text-violet-700 mb-2">Currently Selected:</p>
          <div className="flex flex-wrap gap-2">
            {selectedInstruments.map(id => {
              const instrument = instruments.find(i => i.id === id);
              return instrument ? (
                <span
                  key={id}
                  className="px-3 py-1 bg-white rounded-full text-xs font-medium text-violet-700 border border-violet-200 shadow-sm"
                >
                  {instrument.emoji} {instrument.name}
                </span>
              ) : null;
            })}
            <span className="px-3 py-1 bg-violet-100 rounded-full text-xs font-medium text-violet-600 border border-dashed border-violet-300">
              + {maxInstruments - selectedInstruments.length} more available
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstrumentSelector;
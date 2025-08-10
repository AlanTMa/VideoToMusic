// components/features/music/InstrumentSelector.tsx

import React from 'react';
import { Music, Piano, Guitar, Drums, Violin } from 'lucide-react';

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
    { id: 'piano', name: 'Piano', icon: Piano, color: 'bg-blue-500' },
    { id: 'guitar', name: 'Guitar', icon: Guitar, color: 'bg-green-500' },
    { id: 'drums', name: 'Drums', icon: Drums, color: 'bg-red-500' },
    { id: 'violin', name: 'Violin', icon: Violin, color: 'bg-purple-500' },
    { id: 'bass', name: 'Bass', icon: Music, color: 'bg-orange-500' },
    { id: 'synth', name: 'Synthesizer', icon: Music, color: 'bg-pink-500' },
    { id: 'flute', name: 'Flute', icon: Music, color: 'bg-cyan-500' },
    { id: 'cello', name: 'Cello', icon: Music, color: 'bg-indigo-500' },
  ];

  const handleToggle = (instrumentId: string) => {
    if (selectedInstruments.includes(instrumentId)) {
      onInstrumentToggle(instrumentId);
    } else if (selectedInstruments.length < maxInstruments) {
      onInstrumentToggle(instrumentId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900">Select Instruments</h4>
        <span className="text-sm text-gray-500">
          {selectedInstruments.length}/{maxInstruments} selected
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3">
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
                p-4 rounded-lg border-2 transition-all text-center
                ${isSelected
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : canSelect
                  ? 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50'
                  : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <div className={`
                w-8 h-8 ${instrument.color} rounded-full flex items-center justify-center mx-auto mb-2
                ${!canSelect ? 'opacity-50' : ''}
              `}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium">{instrument.name}</span>
            </button>
          );
        })}
      </div>

      {selectedInstruments.length === maxInstruments && (
        <p className="text-xs text-gray-500 text-center">
          Maximum number of instruments selected. Deselect one to choose another.
        </p>
      )}
    </div>
  );
};

export default InstrumentSelector;
// components/layout/Header.tsx

import React from 'react';
import Link from 'next/link';
import { Music, Video, Brain, Settings } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Video className="h-8 w-8 text-primary-600" />
              <Music className="h-8 w-8 text-secondary-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">SilentVideoSynth</h1>
              <p className="text-xs text-gray-500">AI Music Generation</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              Generate
            </Link>
            <Link
              href="/training"
              className="text-gray-700 hover:text-primary-600 transition-colors flex items-center space-x-1"
            >
              <Brain className="h-4 w-4" />
              <span>Training</span>
            </Link>
            <Link
              href="/models"
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              Models
            </Link>
            <Link
              href="/evaluation"
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              Evaluation
            </Link>
          </nav>

          {/* Settings */}
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

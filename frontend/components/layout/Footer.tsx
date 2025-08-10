
// components/layout/Footer.tsx

import React from 'react';
import { Github, Heart, ExternalLink } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">SilentVideoSynth</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Advanced AI system for generating emotionally-aligned background music
              for silent videos using multimodal analysis and hybrid neural networks.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="/docs"
                  className="text-gray-600 hover:text-primary-600 text-sm flex items-center space-x-1 transition-colors"
                >
                  <span>Documentation</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="/api"
                  className="text-gray-600 hover:text-primary-600 text-sm flex items-center space-x-1 transition-colors"
                >
                  <span>API Reference</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/silentvideosynth"
                  className="text-gray-600 hover:text-primary-600 text-sm flex items-center space-x-1 transition-colors"
                >
                  <Github className="h-3 w-3" />
                  <span>Source Code</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Tech Stack */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Technology</h3>
            <div className="flex flex-wrap gap-2">
              {['PyTorch', 'Transformers', 'LSTM', 'CLIP', 'Next.js', 'FastAPI', 'MIDI'].map((tech) => (
                <span
                  key={tech}
                  className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-md"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 flex items-center justify-between">
          <p className="text-gray-500 text-sm">
            © 2024 SilentVideoSynth. Built with{' '}
            <Heart className="h-4 w-4 text-red-500 inline mx-1" />
            for creators.
          </p>
          <div className="flex items-center space-x-4">
            <span className="text-gray-400 text-xs">Powered by AI</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


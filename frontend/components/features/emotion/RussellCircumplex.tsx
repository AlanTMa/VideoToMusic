// components/features/emotion/RussellCircumplex.tsx

import React, { useRef, useEffect, useState } from 'react';
import { EmotionCoordinates } from '../../../utils/types';

interface RussellCircumplexProps {
  currentEmotion: EmotionCoordinates;
  onEmotionChange: (emotion: EmotionCoordinates) => void;
  disabled?: boolean;
  width?: number;
  height?: number;
}

const RussellCircumplex: React.FC<RussellCircumplexProps> = ({
  currentEmotion,
  onEmotionChange,
  disabled = false,
  width = 320,
  height = 320,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredEmotion, setHoveredEmotion] = useState<string | null>(null);

  const emotionLabels = [
    { name: 'Excited', x: 0.8, y: 0.8, color: '#f59e0b', emoji: '🎉' },
    { name: 'Happy', x: 0.8, y: 0.4, color: '#10b981', emoji: '😊' },
    { name: 'Peaceful', x: 0.7, y: 0.1, color: '#3b82f6', emoji: '🌊' },
    { name: 'Calm', x: 0.5, y: 0.1, color: '#6b7280', emoji: '😌' },
    { name: 'Sad', x: 0.2, y: 0.3, color: '#6b7280', emoji: '😢' },
    { name: 'Angry', x: 0.2, y: 0.8, color: '#ef4444', emoji: '😠' },
    { name: 'Tense', x: 0.3, y: 0.7, color: '#f97316', emoji: '😰' },
    { name: 'Relaxed', x: 0.6, y: 0.2, color: '#06b6d4', emoji: '😌' },
  ];

  const drawCircumplex = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;

    // Set canvas resolution for retina displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas with gradient background
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, '#faf5ff');
    gradient.addColorStop(1, '#f3e8ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw background circles with gradient
    for (let i = 3; i >= 1; i--) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius * i) / 3, 0, 2 * Math.PI);
      ctx.strokeStyle = i === 3 ? '#e9d5ff' : '#f3e8ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Fill with subtle gradient
      const circleGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, (radius * i) / 3);
      circleGradient.addColorStop(0, 'rgba(139, 92, 246, 0.02)');
      circleGradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = circleGradient;
      ctx.fill();
    }

    // Draw axes with gradients
    ctx.lineWidth = 2;

    // Horizontal axis (valence) with gradient
    const hGradient = ctx.createLinearGradient(20, centerY, width - 20, centerY);
    hGradient.addColorStop(0, '#ef4444');
    hGradient.addColorStop(0.5, '#9ca3af');
    hGradient.addColorStop(1, '#10b981');
    ctx.strokeStyle = hGradient;
    ctx.beginPath();
    ctx.moveTo(20, centerY);
    ctx.lineTo(width - 20, centerY);
    ctx.stroke();

    // Vertical axis (arousal) with gradient
    const vGradient = ctx.createLinearGradient(centerX, height - 20, centerX, 20);
    vGradient.addColorStop(0, '#3b82f6');
    vGradient.addColorStop(0.5, '#9ca3af');
    vGradient.addColorStop(1, '#f59e0b');
    ctx.strokeStyle = vGradient;
    ctx.beginPath();
    ctx.moveTo(centerX, 20);
    ctx.lineTo(centerX, height - 20);
    ctx.stroke();

    // Draw axis labels with better styling
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';

    // Negative label with emoji
    ctx.fillStyle = '#ef4444';
    ctx.fillText('😢', 30, centerY - 20);
    ctx.fillText('Negative', 30, centerY - 8);

    // Positive label with emoji
    ctx.fillStyle = '#10b981';
    ctx.fillText('😊', width - 30, centerY - 20);
    ctx.fillText('Positive', width - 30, centerY - 8);

    // High Arousal label with emoji
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('⚡', centerX, 20);
    ctx.fillText('High Energy', centerX, 32);

    // Low Arousal label with emoji
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('😴', centerX, height - 20);
    ctx.fillText('Low Energy', centerX, height - 8);

    // Draw emotion labels with enhanced style
    emotionLabels.forEach((emotion) => {
      const x = 20 + (emotion.x * (width - 40));
      const y = height - 20 - (emotion.y * (height - 40));

      // Draw emotion point with glow
      ctx.shadowColor = emotion.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = emotion.color;
      ctx.fill();

      // White inner circle
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Draw emoji and label
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(emotion.emoji, x, y - 15);

      ctx.fillStyle = '#374151';
      ctx.font = '500 10px Inter, sans-serif';
      ctx.fillText(emotion.name, x, y - 28);
    });

    // Draw current emotion point with enhanced style
    const currentX = 20 + (currentEmotion.valence * (width - 40));
    const currentY = height - 20 - (currentEmotion.arousal * (height - 40));

    // Outer glow
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(currentX, currentY, 10, 0, 2 * Math.PI);
    const pointGradient = ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, 10);
    pointGradient.addColorStop(0, '#a78bfa');
    pointGradient.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = pointGradient;
    ctx.fill();

    // Inner white dot
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(currentX, currentY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Center dot
    ctx.beginPath();
    ctx.arc(currentX, currentY, 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#7c3aed';
    ctx.fill();

    // Draw connecting lines from current point to axes
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // Line to valence axis
    ctx.beginPath();
    ctx.moveTo(currentX, currentY);
    ctx.lineTo(currentX, centerY);
    ctx.stroke();

    // Line to arousal axis
    ctx.beginPath();
    ctx.moveTo(currentX, currentY);
    ctx.lineTo(centerX, currentY);
    ctx.stroke();

    ctx.setLineDash([]);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert canvas coordinates to emotion coordinates
    const valence = Math.max(0, Math.min(1, (x - 20) / (width - 40)));
    const arousal = Math.max(0, Math.min(1, 1 - (y - 20) / (height - 40)));

    onEmotionChange({ valence, arousal });
  };

  const handleMouseDown = () => {
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || disabled) return;
    handleCanvasClick(event);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    drawCircumplex();
  }, [currentEmotion, width, height]);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-3">
        <h4 className="text-white font-semibold">Russell's Circumplex Model</h4>
      </div>

      <div className="p-5">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`
            rounded-xl cursor-pointer transition-all
            ${disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:shadow-lg hover:scale-[1.02]'
            }
            ${isDragging ? 'scale-[1.02] shadow-lg' : ''}
          `}
          style={{ display: 'block', margin: '0 auto' }}
        />

        <div className="mt-4 text-center space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {isDragging ? '🎯 Drag to adjust' : '👆 Click or drag to set emotion'}
          </p>
          <div className="flex items-center justify-center gap-4 text-xs">
            <span className="px-3 py-1 bg-violet-50 text-violet-700 rounded-full font-medium">
              Valence: {(currentEmotion.valence * 100).toFixed(0)}%
            </span>
            <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full font-medium">
              Arousal: {(currentEmotion.arousal * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RussellCircumplex;
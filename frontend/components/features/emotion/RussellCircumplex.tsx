
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
  width = 300,
  height = 300,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const emotionLabels = [
    { name: 'Excited', x: 0.8, y: 0.8, color: '#f59e0b' },
    { name: 'Happy', x: 0.8, y: 0.4, color: '#10b981' },
    { name: 'Peaceful', x: 0.7, y: 0.1, color: '#3b82f6' },
    { name: 'Calm', x: 0.5, y: 0.1, color: '#6b7280' },
    { name: 'Sad', x: 0.2, y: 0.3, color: '#6b7280' },
    { name: 'Angry', x: 0.2, y: 0.8, color: '#ef4444' },
    { name: 'Tense', x: 0.3, y: 0.7, color: '#f97316' },
    { name: 'Relaxed', x: 0.6, y: 0.2, color: '#06b6d4' },
  ];

  const drawCircumplex = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background circles
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius * i) / 3, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;

    // Horizontal axis (valence)
    ctx.beginPath();
    ctx.moveTo(20, centerY);
    ctx.lineTo(width - 20, centerY);
    ctx.stroke();

    // Vertical axis (arousal)
    ctx.beginPath();
    ctx.moveTo(centerX, 20);
    ctx.lineTo(centerX, height - 20);
    ctx.stroke();

    // Draw labels
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';

    // Axis labels
    ctx.fillText('Negative', 30, centerY - 10);
    ctx.fillText('Positive', width - 30, centerY - 10);
    ctx.fillText('High Arousal', centerX, 30);
    ctx.fillText('Low Arousal', centerX, height - 10);

    // Draw emotion labels
    emotionLabels.forEach((emotion) => {
      const x = 20 + (emotion.x * (width - 40));
      const y = height - 20 - (emotion.y * (height - 40));

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = emotion.color;
      ctx.fill();

      ctx.fillStyle = '#374151';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(emotion.name, x, y - 8);
    });

    // Draw current emotion point
    const currentX = 20 + (currentEmotion.valence * (width - 40));
    const currentY = height - 20 - (currentEmotion.arousal * (height - 40));

    // Glow effect
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(currentX, currentY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#8b5cf6';
    ctx.fill();

    // Inner dot
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(currentX, currentY, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
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
    <div className="bg-white border border-gray-200 rounded-lg p-4">
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
          border border-gray-200 rounded cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-purple-300'}
        `}
        style={{ display: 'block', margin: '0 auto' }}
      />

      <div className="mt-3 text-center">
        <p className="text-sm text-gray-600">
          Click or drag to set emotion coordinates
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Based on Russell's Circumplex Model of Affect
        </p>
      </div>
    </div>
  );
};

export default RussellCircumplex;

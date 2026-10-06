import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { AudioAnalysisData, ProjectTheme } from '../../types';

interface FloatingHeartsProps {
  theme?: ProjectTheme;
  audioAnalysis?: AudioAnalysisData;
}

const HEARTS_CONFIG = [
  { id: 1, x: 180, y: 320, speed: 0.06, amplitude: 18, baseSize: 38, opacity: 0.45, isFilled: true },
  { id: 2, x: 820, y: 380, speed: 0.08, amplitude: 24, baseSize: 48, opacity: 0.35, isFilled: false },
  { id: 3, x: 140, y: 1180, speed: 0.07, amplitude: 20, baseSize: 32, opacity: 0.5, isFilled: true },
  { id: 4, x: 860, y: 980, speed: 0.05, amplitude: 22, baseSize: 42, opacity: 0.4, isFilled: false },
  { id: 5, x: 260, y: 760, speed: 0.09, amplitude: 26, baseSize: 52, opacity: 0.28, isFilled: true },
  { id: 6, x: 740, y: 1260, speed: 0.065, amplitude: 18, baseSize: 36, opacity: 0.45, isFilled: false },
  { id: 7, x: 380, y: 440, speed: 0.075, amplitude: 20, baseSize: 30, opacity: 0.4, isFilled: true },
  { id: 8, x: 680, y: 520, speed: 0.055, amplitude: 22, baseSize: 34, opacity: 0.38, isFilled: false },
  { id: 9, x: 220, y: 1420, speed: 0.085, amplitude: 16, baseSize: 28, opacity: 0.42, isFilled: true },
  { id: 10, x: 800, y: 1460, speed: 0.06, amplitude: 24, baseSize: 40, opacity: 0.35, isFilled: false },
];

export const FloatingHearts: React.FC<FloatingHeartsProps> = ({ theme, audioAnalysis }) => {
  const frame = useCurrentFrame();
  const primaryColor = theme?.primaryColor || '#FF5E7E';

  // Get current audio frame data — O(1) direct index access
  const audioFrame = audioAnalysis?.frames?.[frame] || {
    isBeat: false,
    bass: 0,
    rms: 0,
    mid: 0,
  };

  const { isBeat, bass, rms, mid } = audioFrame;

  return (
    <AbsoluteFill>
      {HEARTS_CONFIG.map((heart) => {
        // Movimiento amplificado sensible a bajos y volumen general
        const dynamicAmplitude = heart.amplitude * (1.0 + bass * 1.5 + rms * 0.8);
        const floatY = Math.sin(frame * heart.speed) * dynamicAmplitude;
        const floatX = Math.cos(frame * (heart.speed * 0.7)) * (dynamicAmplitude * 0.4);
        const rotation = Math.cos(frame * heart.speed * 0.6) * (15 + bass * 25);
        
        // Escala exagerada al compás del beat y frecuencias bajas
        let scale = 1.0 + bass * 0.6 + mid * 0.3;
        if (isBeat) scale *= 1.45;

        // Glow pronunciado en beat
        const glow = isBeat
          ? `drop-shadow(0 0 16px ${primaryColor})`
          : bass > 0.45
          ? `drop-shadow(0 0 8px ${primaryColor}77)`
          : 'none';

        return (
          <div
            key={heart.id}
            style={{
              position: 'absolute',
              left: heart.x,
              top: heart.y,
              opacity: Math.min(1, heart.opacity + (isBeat ? 0.3 : 0) + bass * 0.2),
              transform: `translate(-50%, -50%) translate(${floatX}px, ${floatY}px) rotate(${rotation}deg) scale(${scale})`,
              transformOrigin: 'center center',
              filter: glow,
              transition: 'transform 0.04s ease-out, filter 0.04s ease-out',
            }}
          >
            <svg
              width={heart.baseSize}
              height={heart.baseSize}
              viewBox="0 0 32 32"
              fill={heart.isFilled ? primaryColor : 'none'}
              stroke={heart.isFilled ? 'none' : primaryColor}
              strokeWidth={heart.isFilled ? 0 : 2.5}
            >
              <path d="M16 28 C 16 28 4 20 4 12 C 4 7 8 4 12 4 C 14.5 4 16 6 16 6 C 16 6 17.5 4 20 4 C 24 4 28 7 28 12 C 28 20 16 28 16 28 Z" />
            </svg>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

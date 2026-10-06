import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ProjectTheme, AudioAnalysisData } from '../../types';

interface OrganicDecorationsProps {
  theme?: ProjectTheme;
  audioAnalysis?: AudioAnalysisData;
}

export const OrganicDecorations: React.FC<OrganicDecorationsProps> = ({ theme, audioAnalysis }) => {
  const frame = useCurrentFrame();
  const secondaryColor = theme?.secondaryColor || '#18181B';
  const primaryColor = theme?.primaryColor || '#FF5E7E';


  // Bracket coordinates
  const brackets = [
    { x: 85, y: 220, rot: 0 },
    { x: 915, y: 220, rot: 90 },
    { x: 915, y: 1520, rot: 180 },
    { x: 85, y: 1520, rot: 270 },
  ];

  // Stars distribuidas artísticamente
  const stars = [
    { x: 230, y: 340, speed: 0.07, delay: 0, size: 28 },
    { x: 770, y: 380, speed: 0.05, delay: 20, size: 24 },
    { x: 830, y: 880, speed: 0.08, delay: 10, size: 32 },
    { x: 180, y: 920, speed: 0.06, delay: 15, size: 22 },
    { x: 320, y: 1400, speed: 0.09, delay: 5, size: 26 },
    { x: 740, y: 1440, speed: 0.065, delay: 25, size: 30 },
  ];

  const audioFrame = audioAnalysis?.frames?.[frame] || { isBeat: false, bass: 0 };
  const { isBeat, bass } = audioFrame;
  const bracketScale = 1.0 + (isBeat ? 0.2 : 0) + bass * 0.15;
  const starScaleMultiplier = (isBeat ? 1.55 : 1.0) + bass * 0.5;

  return (
    <AbsoluteFill>
      {/* Corner Brackets que reaccionan al compás */}
      {brackets.map((b, i) => (
        <div
          key={`bracket-${i}`}
          style={{
            position: 'absolute',
            left: b.x,
            top: b.y,
            transform: `rotate(${b.rot}deg) scale(${bracketScale})`,
            transformOrigin: '0 0',
            transition: 'transform 0.04s ease-out',
          }}
        >
          {/* Shadow line */}
          <svg width="48" height="48" viewBox="0 0 40 40" style={{ position: 'absolute', left: 2, top: 2, opacity: 0.4 }}>
            <path d="M 0 40 C 0 20 20 0 40 0" fill="none" stroke={secondaryColor} strokeWidth={isBeat ? '3' : '2'} strokeLinecap="round" opacity="0.35" />
          </svg>
          {/* Main line */}
          <svg width="48" height="48" viewBox="0 0 40 40" style={{ position: 'absolute', left: 0, top: 0 }}>
            <path d="M 0 40 C 0 20 20 0 40 0" fill="none" stroke={isBeat ? primaryColor : secondaryColor} strokeWidth={isBeat ? '3.5' : '2'} strokeLinecap="round" opacity={isBeat ? 0.75 : 0.4} />
          </svg>
        </div>
      ))}

      {/* Stars brillantes */}
      {stars.map((s, i) => {
        const floatY = Math.sin((frame + s.delay) * s.speed) * (14 + bass * 12);
        const floatX = Math.cos((frame + s.delay) * (s.speed * 0.7)) * (8 + bass * 8);
        const rotation = Math.cos((frame + s.delay) * s.speed * 0.5) * (20 + bass * 25);
        
        return (
          <div
            key={`star-${i}`}
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              opacity: Math.min(1, 0.65 + (isBeat ? 0.35 : 0) + bass * 0.25),
              transform: `translate(-50%, -50%) translate(${floatX}px, ${floatY}px) rotate(${rotation}deg) scale(${starScaleMultiplier})`,
              transformOrigin: 'center center',
              filter: isBeat ? `drop-shadow(0 0 14px ${primaryColor})` : 'none',
              transition: 'transform 0.04s ease-out, filter 0.04s ease-out',
            }}
          >
            <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill={primaryColor}>
              <path d="M12 2 Q 12 10 4 12 Q 12 12 12 22 Q 12 14 20 12 Q 12 12 12 2 Z" />
            </svg>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

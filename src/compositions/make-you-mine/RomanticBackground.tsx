import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { ProjectTheme, AudioAnalysisData } from '../../types';

export const RomanticBackground: React.FC<{ theme?: ProjectTheme; audioAnalysis?: AudioAnalysisData }> = ({
  theme,
  audioAnalysis,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const primaryColor = theme?.primaryColor || '#FF5E7E';

  const audioFrame = audioAnalysis?.frames?.[frame] || {
    isBeat: false,
    bass: 0,
    rms: 0,
  };

  const { isBeat, bass, rms } = audioFrame;

  // Pulso de luz y energía rosada de fondo
  const bgBurstOpacity = isBeat ? 0.35 : 0.08 + bass * 0.22;
  const radialSize = 55 + bass * 35 + (isBeat ? 20 : 0);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#FAF9F6',
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }}
    >
      {/* Resplandor radial dinámico que explota al compás del beat */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 50% 50%, ${primaryColor}${Math.floor(bgBurstOpacity * 255).toString(16).padStart(2, '0')} 0%, transparent ${radialSize}%)`,
          transition: 'background 0.05s ease-out',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, #FFFFFF 0%, #FAF9F6 50%, #F5F3ED 100%)',
          opacity: 0.5,
        }}
      />
      {/* Viñeteado que respira con el volumen RMS */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(ellipse at center, transparent ${65 - rms * 15}%, rgba(24, 24, 27, ${0.06 + rms * 0.08}) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

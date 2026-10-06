import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ProjectTheme, AudioAnalysisData } from '../../types';

interface SoftWaveformProps {
  theme?: ProjectTheme;
  audioAnalysis?: AudioAnalysisData;
}

export const SoftWaveform: React.FC<SoftWaveformProps> = ({ theme, audioAnalysis }) => {
  const frame = useCurrentFrame();
  const primaryColor = theme?.primaryColor || '#FF5E7E';
  const secondaryColor = theme?.secondaryColor || '#18181B';

  const audioFrame = audioAnalysis?.frames?.[frame] || {
    rms: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    isBeat: false,
  };

  const { rms, bass, mid, treble, isBeat } = audioFrame;
  const beatMultiplier = isBeat ? 1.8 : 1.0;

  const width = 940;
  const height = 240;
  const pointsCount = 48;

  let refinedPath = `M 0 ${height / 2}`;
  let secondaryPath = `M 0 ${height / 2}`;
  let prevY = height / 2;
  let prevX = 0;
  let prevY2 = height / 2;
  
  for (let i = 1; i <= pointsCount; i++) {
    const t = i / pointsCount;
    const x = t * width;
    
    const distToCenter = Math.abs(t - 0.5) * 2;
    let influence = mid;
    if (distToCenter > 0.6) influence = bass * 1.3;
    else if (distToCenter > 0.3) influence = treble * 1.1;

    // Ondulación senoidal amplificada dependiente del audio
    const baseSine = Math.sin(t * Math.PI * 8 - frame * 0.08) * (12 + bass * 18);
    const audioDeform = Math.sin(t * Math.PI) * influence * 95 * beatMultiplier * Math.max(0.25, rms * 1.4);
    
    const y = height / 2 + baseSine - audioDeform;
    const y2 = height / 2 - (baseSine * 0.8) + (audioDeform * 0.85);
    
    const cp1X = prevX + (x - prevX) / 2;
    const cp1Y = prevY;
    const cp2X = prevX + (x - prevX) / 2;
    const cp2Y = y;
    
    refinedPath += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${x} ${y}`;
    secondaryPath += ` C ${cp1X} ${prevY2}, ${cp2X} ${y2}, ${x} ${y2}`;
    
    prevX = x;
    prevY = y;
    prevY2 = y2;
  }

  const waveGlow = isBeat
    ? `drop-shadow(0 0 24px ${primaryColor}) drop-shadow(0 0 45px ${primaryColor}88)`
    : bass > 0.4
    ? `drop-shadow(0 0 14px ${primaryColor}66)`
    : `drop-shadow(0 0 6px ${primaryColor}22)`;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${1.0 + (isBeat ? 0.08 : 0) + bass * 0.12})`,
          width: width,
          height: height,
          filter: waveGlow,
          transition: 'transform 0.04s ease-out, filter 0.04s ease-out',
        }}
      >
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Sombra / Trazo secundario opuesto */}
          <path
            d={secondaryPath}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={isBeat ? '3' : '2'}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.25 + bass * 0.3}
          />
          {/* Trazo principal vivo */}
          <path
            d={refinedPath}
            fill="none"
            stroke={primaryColor}
            strokeWidth={isBeat ? '5.5' : '4'}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.75 + bass * 0.25}
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

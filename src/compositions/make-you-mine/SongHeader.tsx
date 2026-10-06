import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ProjectTheme, AudioAnalysisData } from '../../types';

export const SongHeader: React.FC<{ theme?: ProjectTheme; audioAnalysis?: AudioAnalysisData }> = ({
  theme,
  audioAnalysis,
}) => {
  const frame = useCurrentFrame();
  const primaryColor = theme?.primaryColor || '#FF5E7E';
  const secondaryColor = theme?.secondaryColor || '#18181B';

  const audioFrame = audioAnalysis?.frames?.[frame] || { isBeat: false, bass: 0 };
  const { isBeat, bass } = audioFrame;

  const headerScale = 1.0 + (isBeat ? 0.08 : 0) + bass * 0.05;
  const dotScale = 1.0 + (isBeat ? 0.8 : 0) + bass * 0.5;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: 260,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `scale(${headerScale})`,
          transition: 'transform 0.04s ease-out',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border: `1.5px solid ${isBeat ? primaryColor : `${secondaryColor}25`}`,
            borderRadius: 24,
            padding: '6px 20px',
            boxShadow: isBeat
              ? `0 4px 20px ${primaryColor}33`
              : '0 2px 10px rgba(24, 24, 27, 0.04)',
            gap: 12,
            transition: 'border-color 0.05s ease-out, box-shadow 0.05s ease-out',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: primaryColor,
              transform: `scale(${dotScale})`,
              boxShadow: isBeat ? `0 0 10px ${primaryColor}` : 'none',
              transition: 'transform 0.04s ease-out',
            }}
          />
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: 3,
              color: secondaryColor,
              textTransform: 'uppercase',
              fontFamily: theme?.fontFamily || 'sans-serif',
            }}
          >
            MAKE YOU MINE
          </div>
          <div style={{ color: secondaryColor, opacity: 0.5 }}>•</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: 1.5,
              color: secondaryColor,
              opacity: 0.53,
              textTransform: 'uppercase',
              fontFamily: theme?.fontFamily || 'sans-serif',
            }}
          >
            FEAT. MOA LISA
          </div>
        </div>

        <svg
          width="300"
          height="20"
          viewBox="0 0 300 20"
          style={{ marginTop: 8 }}
        >
          <path
            d="M 10 10 Q 80 0 150 10 T 290 10"
            fill="none"
            stroke={primaryColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

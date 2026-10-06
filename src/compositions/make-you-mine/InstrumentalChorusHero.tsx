import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { AudioAnalysisData, ProjectTheme } from '../../types';

interface InstrumentalChorusHeroProps {
  theme?: ProjectTheme;
  audioAnalysis?: AudioAnalysisData;
  isInstrumental: boolean;
}

export const InstrumentalChorusHero: React.FC<InstrumentalChorusHeroProps> = ({
  theme,
  audioAnalysis,
  isInstrumental,
}) => {
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

  const { bass, rms, isBeat, mid } = audioFrame;

  // Si no es pasaje instrumental, este elemento no compite con la letra
  if (!isInstrumental) {
    return null;
  }

  // Dinámica exagerada al ritmo de los beats y bajos
  const pulseScale = 1.0 + (isBeat ? 0.35 : 0) + bass * 0.45 + rms * 0.25;
  const rotation = Math.sin(frame * 0.05) * 12;
  const ringScale1 = 1.0 + Math.sin(frame * 0.1) * 0.15 + bass * 0.3;
  const ringScale2 = 1.0 + Math.cos(frame * 0.08) * 0.18 + bass * 0.45;
  const ringScale3 = 1.0 + Math.sin(frame * 0.12 + 1) * 0.22 + bass * 0.6;

  // Ondas orbitales con rotaciones deterministas
  const orbitAngle = frame * 1.8;
  const orbitRadius = 140 + bass * 80;

  // Partículas satélite de corazón alrededor del centro
  const satellites = [0, 60, 120, 180, 240, 300].map((deg, idx) => {
    const rad = ((deg + orbitAngle) * Math.PI) / 180;
    const x = Math.cos(rad) * orbitRadius;
    const y = Math.sin(rad) * orbitRadius;
    const sScale = 0.8 + ((idx % 2 === 0 ? bass : mid) * 0.6) + (isBeat ? 0.3 : 0);
    return { x, y, scale: sScale, idx };
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 15,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Anillos concéntricos resonantes con ondas de Bézier y trazo a mano */}
        <svg
          width="600"
          height="600"
          viewBox="0 0 600 600"
          style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
        >
          {/* Anillo exterior 3 */}
          <circle
            cx="300"
            cy="300"
            r={240 * ringScale3}
            fill="none"
            stroke={primaryColor}
            strokeWidth={isBeat ? '3' : '1.5'}
            strokeDasharray="8 12"
            opacity={0.25 + bass * 0.35}
            style={{ transformOrigin: '300px 300px', transform: `rotate(${frame * 0.5}deg)` }}
          />

          {/* Anillo intermedio 2 */}
          <circle
            cx="300"
            cy="300"
            r={180 * ringScale2}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2"
            strokeDasharray="16 10"
            opacity={0.3 + mid * 0.4}
            style={{ transformOrigin: '300px 300px', transform: `rotate(${-frame * 0.8}deg)` }}
          />

          {/* Anillo interior 1 */}
          <circle
            cx="300"
            cy="300"
            r={120 * ringScale1}
            fill={`${primaryColor}0d`}
            stroke={primaryColor}
            strokeWidth={isBeat ? '4' : '2'}
            opacity={0.4 + bass * 0.5}
            style={{ transformOrigin: '300px 300px' }}
          />
        </svg>

        {/* Partículas satélites en órbita */}
        {satellites.map((sat) => (
          <div
            key={`satellite-${sat.idx}`}
            style={{
              position: 'absolute',
              transform: `translate(${sat.x}px, ${sat.y}px) scale(${sat.scale})`,
              transition: 'transform 0.04s ease-out',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 32 32" fill={primaryColor} opacity={0.75}>
              <path d="M16 28 C 16 28 4 20 4 12 C 4 7 8 4 12 4 C 14.5 4 16 6 16 6 C 16 6 17.5 4 20 4 C 24 4 28 7 28 12 C 28 20 16 28 16 28 Z" />
            </svg>
          </div>
        ))}

        {/* Corazón Maestro Central (Pulsando de forma dramática con el ritmo) */}
        <div
          style={{
            transform: `scale(${pulseScale.toFixed(3)}) rotate(${rotation.toFixed(2)}deg)`,
            filter: isBeat
              ? `drop-shadow(0 0 45px ${primaryColor}) drop-shadow(0 0 75px ${primaryColor}88)`
              : bass > 0.4
              ? `drop-shadow(0 0 25px ${primaryColor}66)`
              : `drop-shadow(0 4px 15px rgba(24,24,27,0.08))`,
            transition: 'transform 0.04s ease-out',
          }}
        >
          <svg width="150" height="150" viewBox="0 0 32 32" fill="none">
            {/* Relleno degradado sutil */}
            <path
              d="M16 28 C 16 28 4 20 4 12 C 4 7 8 4 12 4 C 14.5 4 16 6 16 6 C 16 6 17.5 4 20 4 C 24 4 28 7 28 12 C 28 20 16 28 16 28 Z"
              fill={primaryColor}
              opacity={0.88}
            />
            {/* Trazo vectorial interior de luz */}
            <path
              d="M16 24 C 16 24 7 18 7 12 C 7 8.5 9.5 6 12.5 6 C 14.5 6 16 7.5 16 7.5 C 16 7.5 17.5 6 19.5 6 C 22.5 6 25 8.5 25 12 C 25 18 16 24 16 24 Z"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              opacity={0.65}
            />
          </svg>
        </div>

        {/* Ondas expansivas de choque en cada beat */}
        {isBeat && (
          <div
            style={{
              position: 'absolute',
              width: 320,
              height: 320,
              borderRadius: '50%',
              border: `3px solid ${primaryColor}`,
              opacity: 0.55,
              transform: `scale(${1.2 + bass * 0.5})`,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};

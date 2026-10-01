import React from "react";
import { useCurrentFrame } from "remotion";
import type { AudioAnalysisData } from "../types";

export interface AudioWaveform2DProps {
  analysis?: AudioAnalysisData;
  primaryColor?: string;
  secondaryColor?: string;
  barCount?: number;
  width?: number;
  height?: number;
}

export const AudioWaveform2D: React.FC<AudioWaveform2DProps> = ({
  analysis,
  primaryColor = "#FFE600",
  secondaryColor = "#FF0055",
  barCount = 36,
  width = 900,
  height = 180,
}) => {
  const frame = useCurrentFrame();

  const current = analysis?.frames?.[frame] || {
    bass: 0,
    mid: 0,
    treble: 0,
    rms: 0,
    isBeat: false,
  };

  const { bass, mid, treble, rms, isBeat } = current;

  // Generar alturas de barras basadas matemáticamente en las bandas espectrales
  const bars = Array.from({ length: barCount }, (_, i) => {
    // Normalizar posición de la barra (0 en extremos, 1 en el centro o gradiente espectral)
    const normalizedPos = i / (barCount - 1);

    // Espectro de frecuencias de izquierda a derecha (bajos -> medios -> agudos -> simétrico)
    const centerFactor = 1 - Math.abs(normalizedPos - 0.5) * 2; // 0 en extremos, 1 al centro
    let energyWeight = 0;

    if (normalizedPos < 0.33) {
      energyWeight = bass * (1 - normalizedPos * 3) + mid * (normalizedPos * 3);
    } else if (normalizedPos < 0.66) {
      const t = (normalizedPos - 0.33) * 3;
      energyWeight = mid * (1 - t) + treble * t;
    } else {
      const t = (normalizedPos - 0.66) * 3;
      energyWeight = treble * (1 - t) + bass * t;
    }

    const minHeight = 8;
    const maxHeight = height * 0.9;
    const computedHeight = Math.max(
      minHeight,
      minHeight + energyWeight * maxHeight * (0.8 + centerFactor * 0.4) + rms * 25
    );

    return {
      x: (i * width) / barCount,
      height: computedHeight,
    };
  });

  const barWidth = Math.max(4, Math.floor((width / barCount) * 0.65));

  return (
    <div
      data-testid="audio-waveform-2d"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          overflow: "visible",
          filter: isBeat
            ? `drop-shadow(0 0 20px ${secondaryColor}) drop-shadow(0 0 40px ${primaryColor}99)`
            : `drop-shadow(0 0 8px ${primaryColor}44)`,
          transition: "filter 0.05s ease-out",
        }}
      >
        <defs>
          <linearGradient id="waveformGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={secondaryColor} />
            <stop offset="70%" stopColor={primaryColor} />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
        </defs>

        {bars.map((bar, i) => {
          const y = (height - bar.height) / 2;
          return (
            <rect
              key={`bar-${i}`}
              data-testid={`bar-${i}`}
              x={bar.x}
              y={y}
              width={barWidth}
              height={bar.height}
              rx={barWidth / 2}
              fill="url(#waveformGradient)"
              opacity={0.85 + (bar.height / height) * 0.15}
            />
          );
        })}
      </svg>
    </div>
  );
};

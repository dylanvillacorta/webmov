import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export interface BackgroundLayerProps {
  backgroundColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  imageSrc?: string;
}

export const BackgroundLayer: React.FC<BackgroundLayerProps> = ({
  backgroundColor = "#0A0A0A",
  primaryColor = "#FFE600",
  secondaryColor = "#FF0055",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Animación sutil de zoom Ken Burns (de 1.0 a 1.08)
  const scale = interpolate(frame, [0, durationInFrames || 300], [1.0, 1.08], {
    extrapolateRight: "clamp",
  });

  // Determinar si el fondo es claro / papel artístico (estilo drawn/sketch)
  const isLight = (() => {
    const clean = backgroundColor.replace("#", "");
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
    }
    return false;
  })();

  const backgroundGradient = isLight
    ? `
      radial-gradient(circle at 50% 25%, ${secondaryColor}15 0%, transparent 60%),
      radial-gradient(circle at 50% 75%, ${primaryColor}12 0%, transparent 65%),
      linear-gradient(180deg, #FFFFFF 0%, ${backgroundColor} 50%, #F5F3EF 100%)
    `
    : `
      radial-gradient(circle at 50% 30%, ${secondaryColor}15 0%, transparent 65%),
      radial-gradient(circle at 50% 70%, ${primaryColor}12 0%, transparent 70%),
      linear-gradient(180deg, #050505 0%, ${backgroundColor} 50%, #030303 100%)
    `;

  const vignetteGradient = isLight
    ? "radial-gradient(ellipse at center, transparent 65%, rgba(24, 24, 27, 0.08) 100%)"
    : "radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.85) 100%)";

  return (
    <div
      data-testid="background-layer"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "1080px",
        height: "1920px",
        backgroundColor,
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      {/* Fondo con gradientes de luz dinámicos */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          transform: `scale(${scale.toFixed(4)})`,
          background: backgroundGradient,
        }}
      />

      {/* Viñeteado oscuro perimetral */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: vignetteGradient,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

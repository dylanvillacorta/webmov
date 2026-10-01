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
          background: `
            radial-gradient(circle at 50% 30%, ${secondaryColor}15 0%, transparent 65%),
            radial-gradient(circle at 50% 70%, ${primaryColor}12 0%, transparent 70%),
            linear-gradient(180deg, #050505 0%, ${backgroundColor} 50%, #030303 100%)
          `,
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
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.85) 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

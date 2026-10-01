import React from "react";
import { useCurrentFrame } from "remotion";
import type { LyricsTrackData, TrackConfig } from "../types";

export interface KineticSubtitlesProps {
  track: LyricsTrackData;
  config?: TrackConfig;
  fps?: number;
}

export const KineticSubtitles: React.FC<KineticSubtitlesProps> = ({
  track,
  config,
  fps = 30,
}) => {
  const frame = useCurrentFrame();
  const currentMs = (frame / fps) * 1000;

  const primaryColor = config?.primaryColor || "#FFE600";
  const fontSize = config?.fontSize || 48;
  const baseOpacity = config?.opacity !== undefined ? config.opacity : 1.0;
  const activeScale = config?.activeScale || 1.15;
  const positionY = config?.position?.y || "60%";

  // Encontrar la línea activa para el frame actual
  const activeLine = track.lines.find((line) => {
    // La línea se muestra desde su inicio hasta el final, con 100ms de tolerancia
    return currentMs >= line.startMs - 50 && currentMs <= line.endMs + 150;
  });

  if (!activeLine) {
    return null;
  }

  return (
    <div
      data-testid={`kinetic-subtitles-${track._meta.trackId || "track"}`}
      style={{
        position: "absolute",
        top: positionY,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 60px",
        textAlign: "center",
        zIndex: 20,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "14px 18px",
          maxWidth: "960px",
        }}
      >
        {activeLine.words.map((word, idx) => {
          const isPast = currentMs > word.endMs;
          const isActive = currentMs >= word.startMs && currentMs <= word.endMs;
          const isFuture = currentMs < word.startMs;

          let color = "#FFFFFF";
          let opacity = baseOpacity * 0.7;
          let scale = 1.0;
          let textShadow = "0 2px 6px rgba(0,0,0,0.8)";

          if (isActive) {
            color = primaryColor;
            opacity = baseOpacity;
            scale = activeScale;
            textShadow = `0 0 16px ${primaryColor}, 0 0 32px ${primaryColor}66, 0 4px 12px rgba(0,0,0,0.9)`;
          } else if (isPast) {
            color = "#E0E0E0";
            opacity = baseOpacity * 0.75;
            scale = 1.0;
          } else if (isFuture) {
            color = "#A0A0A0";
            opacity = baseOpacity * 0.3;
            scale = 1.0;
          }

          return (
            <span
              key={`${activeLine.id}-w-${idx}`}
              data-testid={`word-${idx}`}
              data-active={isActive ? "true" : "false"}
              data-past={isPast ? "true" : "false"}
              data-future={isFuture ? "true" : "false"}
              style={{
                display: "inline-block",
                fontSize: `${fontSize}px`,
                fontWeight: isActive ? 900 : 700,
                fontFamily: "Inter, Montserrat, system-ui, sans-serif",
                color,
                opacity,
                transform: `scale(${scale})`,
                textShadow,
                letterSpacing: "-0.5px",
                lineHeight: 1.2,
                transition: "transform 0.05s ease-out, color 0.05s ease-out, opacity 0.05s ease-out",
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};

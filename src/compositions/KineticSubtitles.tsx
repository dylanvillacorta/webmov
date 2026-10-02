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
  const secondaryColor = config?.secondaryColor;
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

          let color = secondaryColor ? secondaryColor : "#FFFFFF";
          let opacity = baseOpacity * 0.7;
          let scale = 1.0;
          let textShadow = secondaryColor
            ? "0 1px 2px rgba(24,24,27,0.08)"
            : "0 2px 6px rgba(0,0,0,0.8)";
          let background: string | undefined = undefined;
          let padding: string | undefined = undefined;
          let borderRadius: string | undefined = undefined;

          if (isActive) {
            color = primaryColor;
            opacity = baseOpacity;
            scale = activeScale;
            if (secondaryColor) {
              textShadow = `0 0 16px ${primaryColor}88, 0 0 28px ${primaryColor}44, 0 2px 4px rgba(24,24,27,0.12)`;
              background = `linear-gradient(104deg, ${primaryColor}24 0%, ${primaryColor}40 50%, ${primaryColor}1e 100%)`;
              padding = "2px 8px";
              borderRadius = "6px 8px 5px 7px";
            } else {
              textShadow = `0 0 16px ${primaryColor}, 0 0 32px ${primaryColor}66, 0 4px 12px rgba(0,0,0,0.9)`;
            }
          } else if (isPast) {
            color = secondaryColor || "#E0E0E0";
            opacity = secondaryColor ? baseOpacity * 0.85 : baseOpacity * 0.75;
            scale = 1.0;
          } else if (isFuture) {
            color = secondaryColor || "#A0A0A0";
            opacity = baseOpacity * 0.3;
            scale = 1.0;
            if (secondaryColor) {
              textShadow = "none";
            }
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
                background,
                padding,
                borderRadius,
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

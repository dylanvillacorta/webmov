import React from "react";
import { Audio } from "remotion";
import type { AudioAnalysisData, LyricsTrackData, ProjectConfig } from "../types";
import { BackgroundLayer } from "./BackgroundLayer";
import { AudioPulse } from "./AudioPulse";
import { AudioWaveform2D } from "./AudioWaveform2D";
import { KineticSubtitles } from "./KineticSubtitles";
import { SafeZoneOverlay } from "./SafeZoneOverlay";

export interface MainCompositionProps {
  config: ProjectConfig;
  audioAnalysis?: AudioAnalysisData;
  lyricsTracks?: Record<string, LyricsTrackData>;
  audioUrl?: string;
  showSafeZones?: boolean;
}

export const MainComposition: React.FC<MainCompositionProps> = ({
  config,
  audioAnalysis,
  lyricsTracks = {},
  audioUrl,
  showSafeZones = false,
}) => {
  const primaryColor = config?.theme?.primaryColor || "#FFE600";
  const secondaryColor = config?.theme?.secondaryColor || "#FF0055";
  const backgroundColor = config?.theme?.backgroundColor || "#0A0A0A";
  const fps = config?.fps || 30;

  const showSubtitles = config?.layers?.showSubtitles ?? true;
  const showWaveform = config?.layers?.showWaveform ?? true;

  // Determinar pistas a renderizar
  const configuredTracks = config?.subtitles?.tracks || [];
  const trackEntries = Object.entries(lyricsTracks);

  return (
    <div
      data-testid="main-composition"
      style={{
        position: "relative",
        width: "1080px",
        height: "1920px",
        overflow: "hidden",
        backgroundColor,
      }}
    >
      {/* 1. Capa de Fondo */}
      <BackgroundLayer
        backgroundColor={backgroundColor}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />

      {/* 2. Capa Reactiva de Audio (Onda 2D y Pulso) */}
      {showWaveform && audioAnalysis && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            transform: "translateY(-50%)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          <AudioPulse
            analysis={audioAnalysis}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
          >
            <AudioWaveform2D
              analysis={audioAnalysis}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              width={920}
              height={180}
            />
          </AudioPulse>
        </div>
      )}

      {/* 3. Capa de Subtítulos Cinéticos Multi-Pista */}
      {showSubtitles && (
        <>
          {configuredTracks.map((trackCfg) => {
            const trackData = lyricsTracks[trackCfg.trackId];
            if (!trackData) return null;
            return (
              <KineticSubtitles
                key={`track-${trackCfg.trackId}`}
                track={trackData}
                config={trackCfg}
                fps={fps}
              />
            );
          })}

          {/* Si hay pistas no declaradas en config.json, renderizarlas con defaults (CFG-04) */}
          {trackEntries
            .filter(([tId]) => !configuredTracks.some((tc) => tc.trackId === tId))
            .map(([tId, trackData], idx) => {
              return (
                <KineticSubtitles
                  key={`unconfigured-track-${tId}`}
                  track={trackData}
                  config={{
                    trackId: tId,
                    position: { y: `${58 + idx * 8}%` },
                    fontSize: 48,
                    primaryColor,
                    activeScale: 1.15,
                  }}
                  fps={fps}
                />
              );
            })}
        </>
      )}

      {/* 4. Overlay de Zonas Seguras de Redes Sociales (TikTok / Reels) */}
      <SafeZoneOverlay showSafeZones={showSafeZones} />

      {/* 5. Audio Sincronizado para Remotion Studio y Render */}
      {audioUrl && <Audio src={audioUrl} />}
    </div>
  );
};

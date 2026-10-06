import React from "react";
import { Audio } from "remotion";
import { z } from "zod";
import type { AudioAnalysisData, LyricsTrackData, ProjectConfig } from "../types";
import { BackgroundLayer } from "./BackgroundLayer";
import { AudioPulse } from "./AudioPulse";
import { AudioWaveform2D } from "./AudioWaveform2D";
import { KineticSubtitles } from "./KineticSubtitles";
import { SafeZoneOverlay } from "./SafeZoneOverlay";
import { DrawnArtOverlay } from "./DrawnArtOverlay";
import { MakeYouMineComposition } from "./MakeYouMineComposition";

export const MainCompositionSchema = z.object({
  config: z.custom<ProjectConfig>(),
  audioAnalysis: z.custom<AudioAnalysisData>().optional(),
  lyricsTracks: z.record(z.custom<LyricsTrackData>()).optional(),
  audioUrl: z.string().optional(),
  showSafeZones: z.boolean().optional(),
});

export type MainCompositionProps = z.infer<typeof MainCompositionSchema>;

export const MainComposition: React.FC<MainCompositionProps> = ({
  config,
  audioAnalysis,
  lyricsTracks = {},
  audioUrl,
  showSafeZones: propShowSafeZones,
}) => {
  const showSafeZones = propShowSafeZones ?? config?.layers?.showSafeZones ?? false;
  const primaryColor = config?.theme?.primaryColor || "#FFE600";
  const secondaryColor = config?.theme?.secondaryColor || "#FF0055";
  const backgroundColor = config?.theme?.backgroundColor || "#0A0A0A";
  const fps = config?.fps || 30;

  const showSubtitles = config?.layers?.showSubtitles ?? true;
  const showWaveform = config?.layers?.showWaveform ?? true;

  // Delegar automáticamente al diseño exclusivo para Make You Mine
  if (config?.title?.toLowerCase() === "make you mine") {
    return (
      <MakeYouMineComposition
        config={config}
        audioAnalysis={audioAnalysis}
        lyricsTracks={lyricsTracks}
        audioUrl={audioUrl}
        showSafeZones={showSafeZones}
      />
    );
  }

  // Detección determinista de fondo claro / estilo artístico drawn
  const isLight = (() => {
    const clean = (backgroundColor || "").replace("#", "");
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
    }
    return false;
  })();

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

      {/* 1.5. Decoraciones Artísticas Dibujadas a Mano (Drawn / Sketch para fondos claros) */}
      <DrawnArtOverlay
        analysis={audioAnalysis}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        title={config?.title || "MAKE YOU MINE"}
        isLight={isLight}
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

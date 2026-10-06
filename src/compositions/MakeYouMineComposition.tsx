import React from 'react';
import { AbsoluteFill, Audio } from 'remotion';
import { z } from 'zod';
import { ProjectConfig, AudioAnalysisData, LyricsTrackData } from '../types';

import { RomanticBackground } from './make-you-mine/RomanticBackground';
import { FloatingHearts } from './make-you-mine/FloatingHearts';
import { OrganicDecorations } from './make-you-mine/OrganicDecorations';
import { SongHeader } from './make-you-mine/SongHeader';
import { SoftWaveform } from './make-you-mine/SoftWaveform';
import { InstrumentalChorusHero } from './make-you-mine/InstrumentalChorusHero';
import { KineticSubtitles } from './KineticSubtitles';
import { SafeZoneOverlay } from './SafeZoneOverlay';
import { useCurrentFrame } from 'remotion';

export const MakeYouMineSchema = z.object({
  config: z.custom<ProjectConfig>(),
  audioAnalysis: z.custom<AudioAnalysisData>().optional(),
  lyricsTracks: z.record(z.custom<LyricsTrackData>()).optional(),
  audioUrl: z.string().optional(),
  showSafeZones: z.boolean().optional(),
});

export type MakeYouMineProps = z.infer<typeof MakeYouMineSchema>;

export const MakeYouMineComposition: React.FC<MakeYouMineProps> = ({
  config,
  audioAnalysis,
  lyricsTracks,
  audioUrl,
  showSafeZones: propShowSafeZones,
}) => {
  const frame = useCurrentFrame();
  const fps = config?.fps || 30;
  const currentMs = (frame / fps) * 1000;

  const { theme, layers, subtitles } = config || {};
  const showSafeZones = propShowSafeZones ?? layers?.showSafeZones ?? false;

  // Detección precisa de si hay letra sonando en el frame actual (en cualquier pista)
  const isSinging = Object.values(lyricsTracks || {}).some((track) =>
    track?.lines?.some(
      (line) => currentMs >= line.startMs - 100 && currentMs <= line.endMs + 200
    )
  );

  return (
    <AbsoluteFill style={{ width: 1080, height: 1920, overflow: 'hidden' }}>
      {/* Z-0: Background reactivo con pulso de luz y energía */}
      <RomanticBackground theme={theme} audioAnalysis={audioAnalysis} />

      {/* Z-2: Organic Decorations con destellos y marcos dinámicos */}
      <OrganicDecorations theme={theme} audioAnalysis={audioAnalysis} />

      {/* Z-3: Floating Hearts con 10 corazones y dinámica acentuada */}
      <FloatingHearts theme={theme} audioAnalysis={audioAnalysis} />

      {/* Z-5: Song Header con píldora e indicador palpitante */}
      <SongHeader theme={theme} audioAnalysis={audioAnalysis} />

      {/* Z-8: Soft Waveform con ondulación dual amplificada */}
      {layers?.showWaveform && (
        <SoftWaveform theme={theme} audioAnalysis={audioAnalysis} />
      )}

      {/* Z-15: Hero Instrumental / Break cuando NO hay voces */}
      <InstrumentalChorusHero
        theme={theme}
        audioAnalysis={audioAnalysis}
        isInstrumental={!isSinging}
      />

      {/* Z-20: Kinetic Subtitles */}
      {layers?.showSubtitles && lyricsTracks && subtitles?.tracks && (
        <AbsoluteFill>
          {subtitles.tracks.map((trackConfig) => {
            const trackData = lyricsTracks[trackConfig.trackId];
            if (!trackData) return null;
            return (
              <KineticSubtitles
                key={trackConfig.trackId}
                track={trackData}
                config={trackConfig}
                fps={config.fps}
              />
            );
          })}
          {Object.keys(lyricsTracks).map((trackId) => {
            const isConfigured = subtitles.tracks?.some(t => t.trackId === trackId);
            if (isConfigured) return null;
            return (
              <KineticSubtitles
                key={`unconfigured-${trackId}`}
                track={lyricsTracks[trackId]}
                fps={config.fps}
              />
            );
          })}
        </AbsoluteFill>
      )}

      {/* Z-9999: Safe Zone Overlay */}
      <SafeZoneOverlay showSafeZones={showSafeZones} />

      {/* Audio Track */}
      {audioUrl && <Audio src={audioUrl} />}
    </AbsoluteFill>
  );
};

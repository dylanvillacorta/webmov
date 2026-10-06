import React from "react";
import { Composition } from "remotion";
import {
  MainComposition,
  MainCompositionProps,
  MainCompositionSchema,
} from "./compositions/MainComposition";
import { MakeYouMineComposition, MakeYouMineSchema } from "./compositions/MakeYouMineComposition";

// Carga de datos de muestra para el entorno de desarrollo interactivo (Remotion Studio)
import sampleConfig from "../projects/sample/config.json";
import sampleAudioAnalysis from "../projects/sample/generated/audio-analysis.json";
import sampleLeadLyrics from "../projects/sample/generated/lyrics/lead.json";
import sampleBackingLyrics from "../projects/sample/generated/lyrics/backing.json";

import makeYouMineConfig from "../projects/make-you-mine/config.json";
import makeYouMineAudioAnalysis from "../projects/make-you-mine/generated/audio-analysis.json";
import makeYouMineLyrics from "../projects/make-you-mine/generated/lyrics/make you mine.json";
import makeYouMineAudio from "../projects/make-you-mine/sources/audio/01 - Make You Mine (feat. Moa Lisa).mp3";

export const Root: React.FC = () => {
  const defaultProps: MainCompositionProps = {
    config: sampleConfig as any,
    audioAnalysis: sampleAudioAnalysis as any,
    lyricsTracks: {
      lead: sampleLeadLyrics as any,
      backing: sampleBackingLyrics as any,
    },
    showSafeZones: false,
  };

  const durationInFrames =
    sampleConfig.durationInFrames ||
    sampleAudioAnalysis._meta.frameCount ||
    300;

  const fps = sampleConfig.fps || 30;
  const width = sampleConfig.width || 1080;
  const height = sampleConfig.height || 1920;

  const makeYouMineDuration =
    makeYouMineConfig.durationInFrames ||
    makeYouMineAudioAnalysis._meta.frameCount ||
    6372;

  return (
    <>
      <Composition
        id="WebMovMain"
        component={MainComposition}
        durationInFrames={durationInFrames}
        fps={fps}
        width={width}
        height={height}
        schema={MainCompositionSchema}
        defaultProps={defaultProps}
        calculateMetadata={({ props }) => {
          const cfg = props?.config;
          const analysis = props?.audioAnalysis;
          const dynamicDuration =
            cfg?.durationInFrames ||
            analysis?._meta?.frameCount ||
            durationInFrames;
          const dynamicFps = cfg?.fps || fps;
          const dynamicWidth = cfg?.width || width;
          const dynamicHeight = cfg?.height || height;
          return {
            durationInFrames: dynamicDuration,
            fps: dynamicFps,
            width: dynamicWidth,
            height: dynamicHeight,
          };
        }}
      />
      <Composition
        id="MakeYouMine"
        component={MakeYouMineComposition}
        durationInFrames={makeYouMineDuration}
        fps={makeYouMineConfig.fps || 30}
        width={makeYouMineConfig.width || 1080}
        height={makeYouMineConfig.height || 1920}
        schema={MakeYouMineSchema}
        defaultProps={{
          config: makeYouMineConfig as any,
          audioAnalysis: makeYouMineAudioAnalysis as any,
          lyricsTracks: {
            "make you mine": makeYouMineLyrics as any,
          },
          audioUrl: makeYouMineAudio,
          showSafeZones: false,
        }}
      />
    </>
  );
};

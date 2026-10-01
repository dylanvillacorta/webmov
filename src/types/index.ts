export interface MetaHeader {
  generator: string;
  schemaVersion: string;
  generatedAt: string;
  trackId?: string;
  sourceFile?: string;
  sourceHash?: string;
  durationInSeconds?: number;
  frameCount?: number;
  fps?: number;
}

export interface AudioAnalysisFrame {
  frame: number;
  rms: number;
  bass: number;
  mid: number;
  treble: number;
  isBeat: boolean;
}

export interface AudioAnalysisData {
  _meta: MetaHeader;
  frames: AudioAnalysisFrame[];
}

export interface LyricWord {
  text: string;
  startMs: number;
  endMs: number;
}

export interface LyricLine {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  words: LyricWord[];
}

export interface LyricsTrackData {
  _meta: MetaHeader;
  lines: LyricLine[];
}

export interface TrackConfig {
  trackId: string;
  position?: { y: string };
  fontSize?: number;
  primaryColor?: string;
  secondaryColor?: string;
  opacity?: number;
  activeScale?: number;
}

export interface ProjectTheme {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
}

export interface ProjectLayers {
  showSubtitles?: boolean;
  showWaveform?: boolean;
  showParticles?: boolean;
  enable3D?: boolean;
}

export interface ProjectConfig {
  title?: string;
  fps?: number;
  width?: number;
  height?: number;
  durationInFrames?: number;
  theme?: ProjectTheme;
  subtitles?: {
    tracks?: TrackConfig[];
  };
  layers?: ProjectLayers;
  customProfiles?: Record<string, EncodingProfile>;
}

export interface EncodingProfile {
  name: string;
  base?: string;
  useGpu?: boolean;
  videoCodec?: string;
  preset?: string;
  tune?: string;
  crf?: number;
  bitrate?: string;
  maxrate?: string;
  bufsize?: string;
  gop?: number;
  profile?: string;
  level?: string;
  audioCodec?: string;
  audioBitrate?: string;
  colorPrimaries?: string;
  colorTrc?: string;
  colorSpace?: string;
  colorRange?: string;
  customArgs?: string[];
}

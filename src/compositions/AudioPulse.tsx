import React from "react";
import { useCurrentFrame } from "remotion";
import type { AudioAnalysisData } from "../types";

export interface AudioPulseProps {
  analysis?: AudioAnalysisData;
  primaryColor?: string;
  secondaryColor?: string;
  children?: React.ReactNode;
}

export const AudioPulse: React.FC<AudioPulseProps> = ({
  analysis,
  primaryColor = "#FFE600",
  secondaryColor = "#FF0055",
  children,
}) => {
  const frame = useCurrentFrame();
  const current = analysis?.frames?.[frame] || {
    bass: 0,
    mid: 0,
    treble: 0,
    rms: 0,
    isBeat: false,
  };

  const scale = 1 + current.bass * 0.12 + (current.isBeat ? 0.06 : 0);
  const glow = current.isBeat
    ? `drop-shadow(0 0 35px ${secondaryColor}) drop-shadow(0 0 65px ${primaryColor}88)`
    : current.bass > 0.4
    ? `drop-shadow(0 0 20px ${primaryColor}44)`
    : "none";

  return (
    <div
      data-testid="audio-pulse-container"
      data-beat={current.isBeat ? "true" : "false"}
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        transform: `scale(${scale.toFixed(4)})`,
        filter: glow,
        transition: "transform 0.05s ease-out, filter 0.05s ease-out",
      }}
    >
      {children}
    </div>
  );
};

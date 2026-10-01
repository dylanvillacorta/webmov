import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import crypto from "crypto";
import { MainComposition } from "../../src/compositions/MainComposition";
import sampleConfig from "../../projects/sample/config.json";
import sampleAudioAnalysis from "../../projects/sample/generated/audio-analysis.json";
import sampleLeadLyrics from "../../projects/sample/generated/lyrics/lead.json";
import sampleBackingLyrics from "../../projects/sample/generated/lyrics/backing.json";

let mockFrame = 150;

vi.mock("remotion", () => ({
  useCurrentFrame: () => mockFrame,
  useVideoConfig: () => ({ fps: 30, durationInFrames: 300, width: 1080, height: 1920 }),
  Audio: () => <div data-testid="mock-audio" />,
  interpolate: (input: number, inputRange: number[], outputRange: number[]) => {
    const [inMin, inMax] = inputRange;
    const [outMin, outMax] = outputRange;
    const progress = Math.min(Math.max((input - inMin) / (inMax - inMin), 0), 1);
    return outMin + progress * (outMax - outMin);
  },
}));

describe("Módulo E: Determinismo Estricto Cuadro a Cuadro (VIS-01)", () => {
  it("VIS-01: Renderizar el frame 150 diez veces consecutivas produce exactamente el mismo hash HTML", () => {
    mockFrame = 150;

    const hashes: string[] = [];

    for (let i = 0; i < 10; i++) {
      const { container, unmount } = render(
        <MainComposition
          config={sampleConfig as any}
          audioAnalysis={sampleAudioAnalysis as any}
          lyricsTracks={{
            lead: sampleLeadLyrics as any,
            backing: sampleBackingLyrics as any,
          }}
          showSafeZones={false}
        />
      );

      const html = container.innerHTML;
      const hash = crypto.createHash("sha256").update(html).digest("hex");
      hashes.push(hash);
      unmount();
    }

    // Todos los hashes deben ser exactamente idénticos
    const firstHash = hashes[0];
    expect(hashes.length).toBe(10);
    hashes.forEach((h) => expect(h).toBe(firstHash));
  });
});

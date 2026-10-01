import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { AudioWaveform2D } from "../../src/compositions/AudioWaveform2D.js";
import type { AudioAnalysisData } from "../../src/types/index.js";

let mockFrame = 0;

vi.mock("remotion", () => ({
  useCurrentFrame: () => mockFrame,
  useVideoConfig: () => ({ fps: 30, durationInFrames: 300, width: 1080, height: 1920 }),
}));

describe("Módulo E: Componentes Visuales - AudioWaveform2D (VIS-05, VIS-06)", () => {
  const mockAnalysis: AudioAnalysisData = {
    _meta: {
      generator: "webmov",
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      frameCount: 2,
    },
    frames: [
      // Frame 0: Audio bajo, sin beat
      { frame: 0, rms: 0.1, bass: 0.1, mid: 0.1, treble: 0.1, isBeat: false },
      // Frame 1: Golpe fuerte de batería (bass=0.95, isBeat=true)
      { frame: 1, rms: 0.9, bass: 0.95, mid: 0.8, treble: 0.5, isBeat: true },
    ],
  };

  it("VIS-05: Barras aumentan de altura sustancialmente ante frame con bass y rms alto", () => {
    mockFrame = 0;
    const { getByTestId, rerender } = render(
      <AudioWaveform2D analysis={mockAnalysis} barCount={10} width={400} height={100} />
    );

    const barAtQuiet = parseFloat(getByTestId("bar-0").getAttribute("height") || "0");

    // Cambiar al frame 1 con alto bass
    mockFrame = 1;
    rerender(<AudioWaveform2D analysis={mockAnalysis} barCount={10} width={400} height={100} />);

    const barAtLoud = parseFloat(getByTestId("bar-0").getAttribute("height") || "0");

    expect(barAtLoud).toBeGreaterThan(barAtQuiet * 2);
  });

  it("VIS-06: Destello drop-shadow reforzado cuando isBeat === true", () => {
    mockFrame = 1; // isBeat = true
    const { container } = render(
      <AudioWaveform2D
        analysis={mockAnalysis}
        primaryColor="#FFE600"
        secondaryColor="#FF0055"
      />
    );

    const svg = container.querySelector("svg");
    expect(svg?.style.filter).toContain("drop-shadow");
    expect(svg?.style.filter).toContain("#FF0055");
  });
});

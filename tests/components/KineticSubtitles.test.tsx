import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import type { LyricsTrackData } from "../../src/types/index.js";
import { KineticSubtitles } from "../../src/compositions/KineticSubtitles.js";

// Variable mutable para simular el frame actual de Remotion
let currentMockFrame = 0;

vi.mock("remotion", () => ({
  useCurrentFrame: () => currentMockFrame,
  useVideoConfig: () => ({ fps: 30, durationInFrames: 300, width: 1080, height: 1920 }),
}));

describe("Módulo E: Componentes Visuales - KineticSubtitles (VIS-02, VIS-03, VIS-04)", () => {
  const mockTrack: LyricsTrackData = {
    _meta: {
      generator: "webmov",
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      trackId: "lead",
    },
    lines: [
      {
        id: "line-1",
        startMs: 1000,
        endMs: 3000,
        text: "Uno Dos Tres",
        words: [
          { text: "Uno", startMs: 1000, endMs: 1600 },
          { text: "Dos", startMs: 1600, endMs: 2300 },
          { text: "Tres", startMs: 2300, endMs: 3000 },
        ],
      },
    ],
  };

  beforeEach(() => {
    currentMockFrame = 0;
  });

  it("VIS-03: Palabra activa (startMs <= currentMs <= endMs) adquiere color primario y escala aumentada", () => {
    // A 30 FPS: frame 40 = (40 / 30) * 1000 = 1333.3 ms (palabra 'Uno' entre 1000 y 1600)
    currentMockFrame = 40;

    const { getByTestId } = render(
      <KineticSubtitles
        track={mockTrack}
        config={{
          trackId: "lead",
          primaryColor: "#FFE600",
          activeScale: 1.2,
          fontSize: 50,
        }}
        fps={30}
      />
    );

    const word0 = getByTestId("word-0");
    const word1 = getByTestId("word-1");
    const word2 = getByTestId("word-2");

    expect(word0.getAttribute("data-active")).toBe("true");
    expect(word0.style.color).toBe("rgb(255, 230, 0)"); // #FFE600
    expect(word0.style.transform).toBe("scale(1.2)");

    // Las siguientes son futuras
    expect(word1.getAttribute("data-future")).toBe("true");
    expect(word2.getAttribute("data-future")).toBe("true");
  });

  it("VIS-02: Palabra pasada (currentMs > endMs) tiene opacidad base normal y escala neutra", () => {
    // Frame 60 = 2000 ms ('Uno' ya terminó a 1600, 'Dos' está activa entre 1600 y 2300)
    currentMockFrame = 60;

    const { getByTestId } = render(
      <KineticSubtitles
        track={mockTrack}
        config={{
          trackId: "lead",
          primaryColor: "#FFE600",
        }}
        fps={30}
      />
    );

    const word0 = getByTestId("word-0");
    const word1 = getByTestId("word-1");

    expect(word0.getAttribute("data-past")).toBe("true");
    expect(word0.style.transform).toBe("scale(1)");
    expect(word1.getAttribute("data-active")).toBe("true");
  });

  it("VIS-04: Palabra futura (currentMs < startMs) tiene baja opacidad (0.3)", () => {
    // Frame 40 = 1333 ms ('Tres' empieza a 2300 ms)
    currentMockFrame = 40;

    const { getByTestId } = render(
      <KineticSubtitles
        track={mockTrack}
        config={{
          trackId: "lead",
          primaryColor: "#FFE600",
        }}
        fps={30}
      />
    );

    const word2 = getByTestId("word-2");
    expect(word2.getAttribute("data-future")).toBe("true");
    expect(word2.style.opacity).toBe("0.3");
  });

  it("Línea fuera de rango temporal no renderiza nodo (null)", () => {
    // Frame 120 = 4000 ms (la línea terminó a 3000 ms)
    currentMockFrame = 120;

    const { queryByTestId } = render(
      <KineticSubtitles
        track={mockTrack}
        config={{ trackId: "lead" }}
        fps={30}
      />
    );

    expect(queryByTestId("kinetic-subtitles-lead")).toBeNull();
  });
});

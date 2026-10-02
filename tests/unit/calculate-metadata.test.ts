import { describe, it, expect } from "vitest";
import { calculateWebMovMetadata } from "../../src/Root";

describe("Cálculo dinámico de metadatos (calculateWebMovMetadata)", () => {
  it("prioriza config.durationInFrames sobre audioAnalysis._meta.frameCount y usa dimensiones personalizadas", () => {
    const result = (calculateWebMovMetadata as any)({
      props: {
        config: { durationInFrames: 120, fps: 60, width: 720, height: 1280 },
        audioAnalysis: {
          _meta: { frameCount: 450 },
          frames: [],
        },
      },
    });

    expect(result.durationInFrames).toBe(120);
    expect(result.fps).toBe(60);
    expect(result.width).toBe(720);
    expect(result.height).toBe(1280);
  });

  it("utiliza audioAnalysis._meta.frameCount cuando config.durationInFrames no está definido", () => {
    const result = (calculateWebMovMetadata as any)({
      props: {
        config: {},
        audioAnalysis: {
          _meta: { frameCount: 250 },
          frames: [],
        },
      },
    });

    expect(result.durationInFrames).toBe(250);
    expect(result.fps).toBe(30);
    expect(result.width).toBe(1080);
    expect(result.height).toBe(1920);
  });

  it("hace fallback a 300 cuadros y dimensiones por defecto (30 FPS, 1080x1920) si no se proveen valores", () => {
    const result = (calculateWebMovMetadata as any)({
      props: {},
    });

    expect(result.durationInFrames).toBe(300);
    expect(result.fps).toBe(30);
    expect(result.width).toBe(1080);
    expect(result.height).toBe(1920);
  });
});

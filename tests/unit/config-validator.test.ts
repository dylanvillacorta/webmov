import { describe, it, expect } from "vitest";
import { validateProjectConfig } from "../../src/config/schema.js";

describe("Módulo D: Configuración y Validación de Esquemas (config.json)", () => {
  it("CFG-03: Objeto vacío o ausente genera configuración por defecto", () => {
    const config = validateProjectConfig({});

    expect(config.width).toBe(1080);
    expect(config.height).toBe(1920);
    expect(config.fps).toBe(30);
    expect(config.theme?.primaryColor).toBe("#FFE600");
    expect(config.theme?.backgroundColor).toBe("#0A0A0A");
    expect(config.layers?.showSubtitles).toBe(true);
    expect(config.layers?.showWaveform).toBe(true);
  });

  it("CFG-02: Tipos y rangos inválidos arrojan error pedagógico con la propiedad exacta", () => {
    expect(() =>
      validateProjectConfig({
        fps: -10,
        theme: { primaryColor: "rojo-invalido" },
      })
    ).toThrow(/Error en config.json/);

    try {
      validateProjectConfig({
        fps: -10,
        theme: { primaryColor: "rojo-invalido" },
      });
    } catch (err: any) {
      expect(err.message).toContain("fps");
      expect(err.message).toContain("primaryColor");
    }
  });

  it("CFG-05: Carga configuración avanzada multi-pista con éxito", () => {
    const custom = {
      title: "Promo Avanzada",
      fps: 60,
      width: 1080,
      height: 1920,
      subtitles: {
        tracks: [
          {
            trackId: "lead",
            position: { y: "65%" },
            fontSize: 54,
            primaryColor: "#FF0055",
          },
          {
            trackId: "backing",
            position: { y: "35%" },
            fontSize: 36,
            primaryColor: "#00E5FF",
            opacity: 0.8,
          },
        ],
      },
    };

    const validated = validateProjectConfig(custom);
    expect(validated.fps).toBe(60);
    expect(validated.subtitles?.tracks?.length).toBe(2);
    expect(validated.subtitles?.tracks?.[0].primaryColor).toBe("#FF0055");
    expect(validated.subtitles?.tracks?.[1].opacity).toBe(0.8);
  });
});

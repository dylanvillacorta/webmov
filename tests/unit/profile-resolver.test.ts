import { describe, it, expect } from "vitest";
import { resolveEncodingProfile } from "../../scripts/render/profile-resolver.js";
import { buildFfmpegArgs } from "../../scripts/render/ffmpeg-args.js";

describe("Módulo F: Motor de Exportación y Perfiles FFmpeg (profile-resolver.ts & ffmpeg-args.ts)", () => {
  it("RND-02: Perfil inexistente arroja error pedagógico listando perfiles disponibles", () => {
    expect(() => resolveEncodingProfile("desconocido")).toThrow(
      /El perfil 'desconocido' no existe. Perfiles válidos: \[tiktok, whatsapp\]/
    );
  });

  it("RND-04: Preset 'tiktok' resuelve parámetros maestros (10M, GOP 60, bt709, High 4.2)", () => {
    const profile = resolveEncodingProfile("tiktok");

    expect(profile.name).toBe("tiktok");
    expect(profile.bitrate).toBe("10M");
    expect(profile.gop).toBe(60);
    expect(profile.colorPrimaries).toBe("bt709");
    expect(profile.colorRange).toBe("tv");
    expect(profile.profile).toBe("high");
    expect(profile.level).toBe("4.2");

    const args = buildFfmpegArgs(profile);
    expect(args).toContain("-b:v");
    expect(args).toContain("10M");
    expect(args).toContain("-g");
    expect(args).toContain("60");
    expect(args).toContain("-color_primaries");
    expect(args).toContain("bt709");
    expect(args).toContain("+faststart");
  });

  it("RND-05: Preset 'whatsapp' resuelve perfil liviano (2800k, GOP 30, Main 4.0)", () => {
    const profile = resolveEncodingProfile("whatsapp");

    expect(profile.name).toBe("whatsapp");
    expect(profile.bitrate).toBe("2800k");
    expect(profile.gop).toBe(30);
    expect(profile.profile).toBe("main");

    const args = buildFfmpegArgs(profile);
    expect(args).toContain("-b:v");
    expect(args).toContain("2800k");
    expect(args).toContain("-g");
    expect(args).toContain("30");
  });

  it("RND-06: Overrides dinámicos por CLI sobreescriben valores al vuelo", () => {
    const profile = resolveEncodingProfile("tiktok", null, {
      bitrate: "16M",
      gop: 90,
      preset: "slow",
    });

    expect(profile.bitrate).toBe("16M");
    expect(profile.gop).toBe(90);
    expect(profile.preset).toBe("slow");
    // Conserva los demás metadatos de tiktok
    expect(profile.colorPrimaries).toBe("bt709");

    const args = buildFfmpegArgs(profile);
    expect(args).toContain("16M");
    expect(args).toContain("90");
    expect(args).toContain("slow");
  });

  it("Modo CRF anula bitrate fijo", () => {
    const profile = resolveEncodingProfile("tiktok", null, {
      crf: 18,
    });

    expect(profile.crf).toBe(18);
    expect(profile.bitrate).toBeUndefined();

    const args = buildFfmpegArgs(profile);
    expect(args).toContain("-crf");
    expect(args).toContain("18");
    expect(args).not.toContain("-b:v");
  });

  it("Herencia de perfiles personalizados definidos en config.json", () => {
    const customConfig = {
      customProfiles: {
        "custom-promo": {
          name: "custom-promo",
          base: "tiktok",
          bitrate: "14M",
          profile: "main",
        },
      },
    };

    const profile = resolveEncodingProfile("custom-promo", customConfig as any);
    expect(profile.name).toBe("custom-promo");
    expect(profile.bitrate).toBe("14M");
    expect(profile.profile).toBe("main");
    // Heredado de tiktok
    expect(profile.gop).toBe(60);
    expect(profile.colorPrimaries).toBe("bt709");
  });
});

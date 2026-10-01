import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import type { EncodingProfile, ProjectConfig } from "../../src/types/index.js";
import defaultProfiles from "../../src/profiles/encoding-profiles.json";

export interface CliOverrides {
  bitrate?: string;
  crf?: number;
  gop?: number;
  preset?: string;
  useGpu?: boolean;
}

/**
 * Comprueba si la aceleración por hardware NVIDIA (h264_nvenc) está disponible y funcional.
 */
export function isNvencAvailable(): boolean {
  try {
    execSync(
      `ffmpeg -v error -f lavfi -i color=c=black:s=64x64:d=0.04 -c:v h264_nvenc -f null -`,
      {
        stdio: ["ignore", "ignore", "ignore"],
      }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Resuelve y fusiona el perfil de codificación en caliente a partir de presets, config del proyecto y flags de CLI.
 */
export function resolveEncodingProfile(
  profileName: string,
  projectConfig?: ProjectConfig | null,
  overrides?: CliOverrides
): EncodingProfile {
  // 1. Catálogo unificado de perfiles disponibles
  const catalog: Record<string, EncodingProfile> = {
    ...defaultProfiles,
    ...(projectConfig?.customProfiles || {}),
  };

  if (!catalog[profileName]) {
    const validProfiles = Object.keys(catalog);
    throw new Error(
      `El perfil '${profileName}' no existe. Perfiles válidos: [${validProfiles.join(
        ", "
      )}] o perfiles personalizados en config.json.`
    );
  }

  const rawProfile = catalog[profileName];

  // 2. Resolver herencia si define 'base'
  let baseProfile: Partial<EncodingProfile> = {};
  if (rawProfile.base) {
    if (!catalog[rawProfile.base]) {
      throw new Error(
        `El perfil base '${rawProfile.base}' referenciado por '${profileName}' no existe.`
      );
    }
    baseProfile = catalog[rawProfile.base];
  }

  // 3. Fusionar base + perfil
  const resolved: EncodingProfile = {
    ...baseProfile,
    ...rawProfile,
  };

  // 4. Inyectar overrides en caliente pasados por CLI
  if (overrides) {
    if (overrides.bitrate !== undefined) {
      resolved.bitrate = overrides.bitrate;
      delete resolved.crf; // Bitrate explícito anula modo CRF
    }
    if (overrides.crf !== undefined) {
      resolved.crf = overrides.crf;
      delete resolved.bitrate; // CRF explícito anula bitrate fijo
      delete resolved.maxrate;
      delete resolved.bufsize;
    }
    if (overrides.gop !== undefined) {
      resolved.gop = overrides.gop;
    }
    if (overrides.preset !== undefined) {
      resolved.preset = overrides.preset;
    }
    if (overrides.useGpu !== undefined) {
      resolved.useGpu = overrides.useGpu;
    }
  }

  // 5. Manejo seguro de aceleración por GPU con fallback a CPU (RND-03)
  if (resolved.useGpu) {
    const gpuOk = isNvencAvailable();
    if (!gpuOk) {
      console.warn(
        "⚠️ GPU NVIDIA no detectada. Continuando con codificación por software (CPU libx264)."
      );
      resolved.useGpu = false;
      resolved.videoCodec = "libx264";
      if (resolved.preset === "p6" || resolved.preset === "p4") {
        resolved.preset = "medium";
      }
    } else {
      resolved.videoCodec = "h264_nvenc";
    }
  }

  return resolved;
}

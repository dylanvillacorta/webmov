import type { EncodingProfile } from "../../src/types/index.js";

/**
 * Construye la lista de argumentos adicionales para overrideFfmpegArgs en @remotion/renderer.
 * Inyecta estrictamente metadatos VUI Rec. 709, estructura GOP cerrada y optimizaciones para redes.
 */
export function buildFfmpegArgs(profile: EncodingProfile): string[] {
  const args: string[] = [];

  // 1. Códec de Video y Aceleración
  if (profile.useGpu) {
    args.push("-c:v", "h264_nvenc");
    if (profile.preset) args.push("-preset", profile.preset);
    if (profile.tune) args.push("-tune", profile.tune);
  } else {
    args.push("-c:v", profile.videoCodec || "libx264");
    if (profile.preset) args.push("-preset", profile.preset);
  }

  // 2. Control de Tasa (CRF o Bitrate VBR)
  if (profile.crf !== undefined) {
    args.push("-crf", profile.crf.toString());
  } else if (profile.bitrate) {
    args.push("-b:v", profile.bitrate);
    if (profile.maxrate) args.push("-maxrate", profile.maxrate);
    if (profile.bufsize) args.push("-bufsize", profile.bufsize);
  }

  // 3. Estructura GOP cerrada
  if (profile.gop) {
    args.push(
      "-g",
      profile.gop.toString(),
      "-keyint_min",
      Math.floor(profile.gop / 2).toString(),
      "-sc_threshold",
      "0"
    );
  }

  // 4. Perfil y Nivel H.264
  if (profile.profile) args.push("-profile:v", profile.profile);
  if (profile.level) args.push("-level:v", profile.level);

  // 5. Metadatos Estrictos de Colorimetría VUI (Rec. 709)
  args.push(
    "-color_primaries",
    profile.colorPrimaries || "bt709",
    "-color_trc",
    profile.colorTrc || "bt709",
    "-colorspace",
    profile.colorSpace || "bt709",
    "-color_range",
    profile.colorRange || "tv",
    "-bsf:v",
    "h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1"
  );

  // 6. Optimización para Streaming y Redes Sociales
  args.push("-movflags", "+faststart");

  // 7. Argumentos adicionales libres
  if (profile.customArgs && Array.isArray(profile.customArgs)) {
    args.push(...profile.customArgs);
  }

  return args;
}

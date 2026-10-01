import fs from "fs";
import path from "path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { validateProjectConfig } from "../src/config/schema.js";
import { resolveEncodingProfile, CliOverrides } from "./render/profile-resolver.js";
import { buildFfmpegArgs } from "./render/ffmpeg-args.js";

function printUsage(): void {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                   WebMov: Motor de Exportación FFmpeg                 ║
╚═══════════════════════════════════════════════════════════════════════╝

Uso:
  npm run render -- --project <nombre_proyecto> [--profile <perfil>] [opciones]

Opciones de Perfil:
  --profile <perfil>      Preset de codificación (por defecto: defaultProfile de config.json o 'tiktok')
                          Presets disponibles: 'tiktok', 'whatsapp' o custom en config.json

Overrides en Caliente:
  --bitrate <tasa>        Sobreescribe la tasa de bits (ej: 16M, 8M, 2800k)
  --crf <modo>            Activa modo CRF psicovisual (ej: 18, 21, 23)
  --gop <frames>          Tamaño del grupo de imágenes / keyframes (ej: 60, 30)
  --preset <preset>       Preset de velocidad FFmpeg (ej: slow, medium, fast)
  --gpu                   Activa aceleración por hardware NVIDIA (h264_nvenc)

Ejemplos:
  npm run render -- --project sample --profile tiktok
  npm run render -- --project sample --profile whatsapp
  npm run render -- --project sample --profile tiktok --bitrate 16M --gop 90
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  let projectName: string | null = null;
  let cliProfile: string | null = null;
  const overrides: CliOverrides = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--project" || arg === "-p") {
      projectName = args[i + 1] || null;
      i++;
    } else if (arg.startsWith("--project=")) {
      projectName = arg.split("=")[1];
    } else if (arg === "--profile") {
      cliProfile = args[i + 1] || null;
      i++;
    } else if (arg.startsWith("--profile=")) {
      cliProfile = arg.split("=")[1];
    } else if (arg === "--bitrate") {
      overrides.bitrate = args[i + 1];
      i++;
    } else if (arg === "--crf") {
      overrides.crf = Number(args[i + 1]);
      i++;
    } else if (arg === "--gop") {
      overrides.gop = Number(args[i + 1]);
      i++;
    } else if (arg === "--preset") {
      overrides.preset = args[i + 1];
      i++;
    } else if (arg === "--gpu") {
      overrides.useGpu = true;
    }
  }

  if (!projectName) {
    console.error("❌ Error: No se especificó el parámetro requerido '--project'.\n");
    printUsage();
    process.exit(1);
  }

  const rootDir = process.cwd();
  const projectDir = path.join(rootDir, "projects", projectName);

  if (!fs.existsSync(projectDir)) {
    console.error(`❌ Error: El proyecto 'projects/${projectName}' no existe.`);
    process.exit(1);
  }

  // 1. RND-01: Validar que el proyecto haya sido preparado
  const generatedDir = path.join(projectDir, "generated");
  const audioAnalysisFile = path.join(generatedDir, "audio-analysis.json");

  if (!fs.existsSync(generatedDir) || !fs.existsSync(audioAnalysisFile)) {
    console.error(
      `❌ Error: El proyecto no ha sido preparado. Ejecute 'npm run prepare -- --project ${projectName}' antes de renderizar.`
    );
    process.exit(1);
  }

  // 2. Cargar datos del proyecto
  let projectConfig: any = {};
  const configPath = path.join(projectDir, "config.json");
  if (fs.existsSync(configPath)) {
    try {
      projectConfig = validateProjectConfig(JSON.parse(fs.readFileSync(configPath, "utf-8")));
    } catch (err: any) {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    }
  }

  const audioAnalysis = JSON.parse(fs.readFileSync(audioAnalysisFile, "utf-8"));

  const lyricsTracks: Record<string, any> = {};
  const lyricsGeneratedDir = path.join(generatedDir, "lyrics");
  if (fs.existsSync(lyricsGeneratedDir)) {
    const files = fs.readdirSync(lyricsGeneratedDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const trackId = path.basename(file, ".json");
      lyricsTracks[trackId] = JSON.parse(fs.readFileSync(path.join(lyricsGeneratedDir, file), "utf-8"));
    }
  }

  // 3. RND-02: Resolver Perfil de Codificación FFmpeg
  const profileName = cliProfile || projectConfig.defaultProfile || "tiktok";
  let profile;
  try {
    profile = resolveEncodingProfile(profileName, projectConfig, overrides);
  } catch (err: any) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  console.log(`\n🚀 Iniciando renderizado para el proyecto: [${projectName}]`);
  console.log(`📋 Perfil aplicado: '${profile.name}' | Códec: ${profile.videoCodec || "libx264"} | Bitrate: ${profile.bitrate || "CRF " + profile.crf} | GOP: ${profile.gop || 60}`);

  // 4. Empaquetar proyecto con Remotion Bundler
  console.log("📦 Compilando composición con @remotion/bundler...");
  const bundleLocation = await bundle({
    entryPoint: path.resolve(rootDir, "src/index.ts"),
    webpackOverride: (config) => config,
  });

  // 5. Seleccionar Composición
  const compositionId = "WebMovMain";
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps: {
      config: projectConfig,
      audioAnalysis,
      lyricsTracks,
      showSafeZones: false,
    },
  });

  // 6. Preparar directorio de exportación
  const exportsDir = path.join(projectDir, "exports");
  fs.mkdirSync(exportsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputFileName = `${projectName}_${profile.name}_${timestamp}.mp4`;
  const outputLocation = path.join(exportsDir, outputFileName);

  const ffmpegArgs = buildFfmpegArgs(profile);

  // 7. Renderizar Video
  console.log(`🎞️ Renderizando ${composition.durationInFrames} cuadros (${composition.width}x${composition.height} @ ${composition.fps} FPS)...`);

  const startTime = Date.now();
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation,
    colorSpace: "bt709",
    gopSize: profile.gop || 60,
    videoBitrate: profile.bitrate as any,
    encodingMaxRate: profile.maxrate as any,
    encodingBufferSize: profile.bufsize as any,
    x264Preset: (profile.preset as any) || "medium",
    crf: profile.crf,
    inputProps: {
      config: projectConfig,
      audioAnalysis,
      lyricsTracks,
      showSafeZones: false,
    },
    ffmpegOverride: ({ type, args }) => {
      if (type === "stitcher") {
        const output = args[args.length - 1];
        const baseArgs = args.slice(0, args.length - 1);
        return [...baseArgs, "-movflags", "+faststart", output];
      }
      return args;
    },
    onProgress: ({ renderedFrames, encodedFrames }) => {
      const percent = Math.floor((encodedFrames / composition.durationInFrames) * 100);
      process.stdout.write(`\r⏳ Progreso: ${percent}% (Cuadro ${encodedFrames}/${composition.durationInFrames})`);
    },
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const stats = fs.statSync(outputLocation);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`\n\n✅ Exportación completada con éxito en ${durationSec}s!`);
  console.log(`📁 Video: ${outputLocation} (${sizeMb} MB)`);
}

main().catch((err) => {
  console.error("\n❌ Error inesperado durante el renderizado:", err);
  process.exit(1);
});

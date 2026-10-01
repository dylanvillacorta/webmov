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

Control de Duracion / Rango:
  --seconds, -s <seg>     Renderiza solo los primeros N segundos del video (ej: 5, 10.5)
  --frames <cuadros>      Renderiza solo los primeros N cuadros del video (ej: 60, 150)
  --range <inicio-fin>    Renderiza un rango de cuadros específico (ej: 0-89, 30-60)

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
  npm run render -- --project sample --seconds 5
  npm run render -- --project sample --range 0-59
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
  let cliSeconds: string | null = null;
  let cliFrames: string | null = null;
  let cliRange: string | null = null;
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
    } else if (arg === "--seconds" || arg === "-s") {
      const next = args[i + 1];
      if (next === undefined || (next.startsWith("-") && !/^-\d/.test(next))) {
        console.error("❌ Error: Debe especificar un valor para '--seconds' o '-s'.");
        process.exit(1);
      }
      cliSeconds = next;
      i++;
    } else if (arg.startsWith("--seconds=")) {
      cliSeconds = arg.slice("--seconds=".length);
    } else if (arg.startsWith("-s=")) {
      cliSeconds = arg.slice("-s=".length);
    } else if (arg === "--frames") {
      const next = args[i + 1];
      if (next === undefined || (next.startsWith("-") && !/^-\d/.test(next))) {
        console.error("❌ Error: Debe especificar un valor para '--frames'.");
        process.exit(1);
      }
      cliFrames = next;
      i++;
    } else if (arg.startsWith("--frames=")) {
      cliFrames = arg.slice("--frames=".length);
    } else if (arg === "--range") {
      const next = args[i + 1];
      if (next === undefined || (next.startsWith("-") && !/^-\d/.test(next))) {
        console.error("❌ Error: Debe especificar un valor para '--range' (ej: '0-90').");
        process.exit(1);
      }
      cliRange = next;
      i++;
    } else if (arg.startsWith("--range=")) {
      cliRange = arg.slice("--range=".length);
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

  // Validación de exclusividad mutua de opciones de rango/duración
  const rangeOptionsCount = [cliSeconds !== null, cliFrames !== null, cliRange !== null].filter(Boolean).length;
  if (rangeOptionsCount > 1) {
    console.error("❌ Error: No se pueden combinar las opciones '--seconds', '--frames' o '--range'. Elija solo una opción.");
    process.exit(1);
  }

  // Validación temprana de sintaxis y formato
  let parsedSeconds: number | null = null;
  if (cliSeconds !== null) {
    parsedSeconds = Number(cliSeconds);
    if (isNaN(parsedSeconds) || parsedSeconds <= 0) {
      console.error(`❌ Error: El parámetro '--seconds' debe ser un número positivo mayor a 0 (recibido: '${cliSeconds}').`);
      process.exit(1);
    }
  }

  let parsedFrames: number | null = null;
  if (cliFrames !== null) {
    parsedFrames = Number(cliFrames);
    if (isNaN(parsedFrames) || !Number.isInteger(parsedFrames) || parsedFrames <= 0) {
      console.error(`❌ Error: El parámetro '--frames' debe ser un número entero positivo mayor a 0 (recibido: '${cliFrames}').`);
      process.exit(1);
    }
  }

  let parsedRange: [number, number] | null = null;
  if (cliRange !== null) {
    const rangeMatch = cliRange.trim().match(/^(\d+)-(\d+)$/);
    if (!rangeMatch) {
      console.error(`❌ Error: El formato de '--range' es inválido (recibido: '${cliRange}'). Debe tener el formato '<inicio>-<fin>' con números enteros no negativos (ej: 0-90, 30-60).`);
      process.exit(1);
    }
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    if (start > end) {
      console.error(`❌ Error: El rango de cuadros es inválido: el cuadro de inicio (${start}) no puede ser mayor al cuadro de fin (${end}).`);
      process.exit(1);
    }
    parsedRange = [start, end];
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

  // Calcular y validar frameRange respecto a la composición seleccionada
  let frameRange: [number, number] | null = null;

  if (parsedSeconds !== null) {
    const requestedFrames = Math.round(parsedSeconds * composition.fps);
    if (requestedFrames <= 0) {
      console.error(`❌ Error: La duración solicitada (${parsedSeconds}s) equivale a 0 cuadros.`);
      process.exit(1);
    }
    if (requestedFrames > composition.durationInFrames) {
      console.error(
        `❌ Error: La duración solicitada (${parsedSeconds}s = ${requestedFrames} cuadros) excede la duración total de la composición (${composition.durationInFrames} cuadros / ${(composition.durationInFrames / composition.fps).toFixed(1)}s).`
      );
      process.exit(1);
    }
    frameRange = [0, requestedFrames - 1];
  } else if (parsedFrames !== null) {
    if (parsedFrames > composition.durationInFrames) {
      console.error(
        `❌ Error: La cantidad de cuadros solicitada (${parsedFrames}) excede la duración total de la composición (${composition.durationInFrames} cuadros).`
      );
      process.exit(1);
    }
    frameRange = [0, parsedFrames - 1];
  } else if (parsedRange !== null) {
    const [start, end] = parsedRange;
    if (start >= composition.durationInFrames || end >= composition.durationInFrames) {
      console.error(
        `❌ Error: El rango especificado [${start}-${end}] excede la duración total de la composición (0 a ${composition.durationInFrames - 1}).`
      );
      process.exit(1);
    }
    frameRange = [start, end];
  }

  const totalFrames = frameRange ? frameRange[1] - frameRange[0] + 1 : composition.durationInFrames;

  // 6. Preparar directorio de exportación
  const exportsDir = path.join(projectDir, "exports");
  fs.mkdirSync(exportsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputFileName = `${projectName}_${profile.name}_${timestamp}.mp4`;
  const outputLocation = path.join(exportsDir, outputFileName);

  const ffmpegArgs = buildFfmpegArgs(profile);

  // 7. Renderizar Video
  if (frameRange) {
    console.log(`✂️ Rango parcial aplicado: cuadros [${frameRange[0]}, ${frameRange[1]}] (${totalFrames} cuadros / ${(totalFrames / composition.fps).toFixed(2)}s)`);
    console.log(`🎞️ Renderizando ${totalFrames} cuadros (rango: ${frameRange[0]}-${frameRange[1]}) (${composition.width}x${composition.height} @ ${composition.fps} FPS)...`);
  } else {
    console.log(`🎞️ Renderizando ${composition.durationInFrames} cuadros (${composition.width}x${composition.height} @ ${composition.fps} FPS)...`);
  }

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
    frameRange: frameRange || null,
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
      const percent = Math.min(100, Math.floor((encodedFrames / totalFrames) * 100));
      process.stdout.write(`\r⏳ Progreso: ${percent}% (Cuadro ${encodedFrames}/${totalFrames})`);
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

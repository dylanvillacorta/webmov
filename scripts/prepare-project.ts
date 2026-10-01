import fs from "fs";
import path from "path";
import { findProjectAudioFile, analyzeAudio } from "./prepare/audio-analyzer.js";
import { processLyricsFile, getFileSha256 } from "./prepare/lrc-parser.js";
import { validateProjectConfig } from "../src/config/schema.js";

function printUsage(): void {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                   WebMov: Pipeline de Preparación                     ║
╚═══════════════════════════════════════════════════════════════════════╝

Uso:
  npm run prepare -- --project <nombre_proyecto> [--force]

Opciones:
  --project, -p <nombre>  Nombre de la carpeta del proyecto en 'projects/'
  --force, -f             Forzar la regeneración completa ignorando la caché
  --help, -h              Muestra este mensaje de ayuda

Ejemplos:
  npm run prepare -- --project sample
  npm run prepare -- --project promo-single --force
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Si se ejecuta sin argumentos desde el hook automático de npm install, salir silenciosamente
  if (args.length === 0) {
    if (process.env.npm_lifecycle_event === "prepare") {
      process.exit(0);
    }
    printUsage();
    process.exit(0);
  }

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  let projectName: string | null = null;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--project" || arg === "-p") {
      projectName = args[i + 1] || null;
      i++;
    } else if (arg.startsWith("--project=")) {
      projectName = arg.split("=")[1];
    } else if (arg === "--force" || arg === "-f") {
      force = true;
    }
  }

  if (!projectName) {
    console.error("❌ Error: No se especificó el parámetro requerido '--project'.\n");
    printUsage();
    process.exit(1);
  }

  const rootDir = process.cwd();
  const projectsDir = path.join(rootDir, "projects");
  const projectDir = path.join(projectsDir, projectName);

  if (!fs.existsSync(projectDir)) {
    const availableProjects = fs.existsSync(projectsDir)
      ? fs
          .readdirSync(projectsDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
      : [];

    console.error(
      `❌ Error: El proyecto 'projects/${projectName}' no existe. Proyectos disponibles: [${availableProjects.join(", ")}]. Cree el directorio o verifique el nombre.`
    );
    process.exit(1);
  }

  const generatedDir = path.join(projectDir, "generated");
  const generatedLyricsDir = path.join(generatedDir, "lyrics");
  fs.mkdirSync(generatedLyricsDir, { recursive: true });

  console.log(`\n🎬 Iniciando preparación para el proyecto: [${projectName}]`);
  const startTime = Date.now();

  // 1. Cargar y Validar Configuración
  const configPath = path.join(projectDir, "config.json");
  let projectConfig = null;
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      projectConfig = validateProjectConfig(JSON.parse(raw));
      console.log("✓ Archivo config.json validado exitosamente.");
    } catch (err: any) {
      console.error(`❌ Error en configuración: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.log("ℹ️ Aviso: No se encontró 'config.json'. Se aplicarán valores por defecto.");
    projectConfig = validateProjectConfig({});
  }

  const fps = projectConfig.fps || 30;

  // 2. Procesar Análisis de Audio
  let audioProcessed = false;
  try {
    const audioFileInfo = findProjectAudioFile(projectDir);
    const audioCacheFile = path.join(generatedDir, "audio-analysis.json");
    const currentAudioHash = getFileSha256(audioFileInfo.fullPath);

    let canSkipAudio = false;
    if (!force && fs.existsSync(audioCacheFile)) {
      try {
        const cached = JSON.parse(fs.readFileSync(audioCacheFile, "utf-8"));
        if (cached?._meta?.sourceHash === currentAudioHash) {
          canSkipAudio = true;
        }
      } catch {
        canSkipAudio = false;
      }
    }

    if (canSkipAudio) {
      console.log("⚡ Audio al día (SKIP)");
    } else {
      process.stdout.write("⏳ Decodificando y analizando audio...");
      const analysis = analyzeAudio(audioFileInfo.fullPath, projectDir, fps);
      fs.writeFileSync(audioCacheFile, JSON.stringify(analysis, null, 2), "utf-8");
      console.log(`\r✓ Audio analizado: ${analysis.frames.length} frames (${analysis._meta.durationInSeconds}s)`);
      audioProcessed = true;
    }
  } catch (err: any) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  // 3. Procesar Letras Multi-Pista
  const lyricsSourcesDir = path.join(projectDir, "sources", "lyrics");
  if (!fs.existsSync(lyricsSourcesDir)) {
    console.log("ℹ️ No se encontró la carpeta 'sources/lyrics/'. El video se generará sin capa de subtítulos.");
  } else {
    const lyricFiles = fs
      .readdirSync(lyricsSourcesDir)
      .filter((f) => [".lrc", ".json"].includes(path.extname(f).toLowerCase()));

    if (lyricFiles.length === 0) {
      console.log("ℹ️ No se encontraron letras en 'sources/lyrics/'. El video se generará sin capa de subtítulos.");
    } else {
      for (const file of lyricFiles) {
        const filePath = path.join(lyricsSourcesDir, file);
        const ext = path.extname(file).toLowerCase();
        const base = path.basename(file, ext);
        const trackId = base.toLowerCase() === "track" ? "main" : base;
        const targetJson = path.join(generatedLyricsDir, `${trackId}.json`);

        const currentHash = getFileSha256(filePath);
        let canSkipTrack = false;

        if (!force && fs.existsSync(targetJson)) {
          try {
            const cached = JSON.parse(fs.readFileSync(targetJson, "utf-8"));
            if (cached?._meta?.sourceHash === currentHash) {
              canSkipTrack = true;
            }
          } catch {
            canSkipTrack = false;
          }
        }

        if (canSkipTrack) {
          console.log(`⚡ Letra pista '${trackId}' al día (SKIP)`);
        } else {
          try {
            const trackData = processLyricsFile(filePath, projectDir);
            fs.writeFileSync(targetJson, JSON.stringify(trackData, null, 2), "utf-8");
            console.log(`✓ Pista de letras '${trackId}' procesada (${trackData.lines.length} líneas)`);
          } catch (err: any) {
            console.error(`❌ ${err.message}`);
            process.exit(1);
          }
        }
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 Preparación de [${projectName}] completada con éxito en ${elapsed}s.\n`);
}

main().catch((err) => {
  console.error("❌ Error inesperado durante la preparación:", err);
  process.exit(1);
});

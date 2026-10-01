import fs from "fs";
import path from "path";
import readline from "node:readline";
import { fileURLToPath } from "url";
import type { ProjectConfig } from "../src/types/index.js";
import { validateProjectConfig } from "../src/config/schema.js";

export interface CliArgs {
  name?: string;
  profile?: string;
  title?: string;
  force?: boolean;
  help?: boolean;
}

export interface CreateProjectOptions {
  name: string;
  profile?: string;
  title?: string;
  force?: boolean;
  rootDir?: string;
}

export interface CreateProjectResult {
  projectDir: string;
  configPath: string;
  lyricsPath: string;
  audioDir: string;
  assetsDir: string;
  config: ProjectConfig;
}

const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const VALID_PROFILES = ["tiktok", "whatsapp"] as const;

/**
 * Valida que el nombre de la carpeta del proyecto sea seguro y compatible con cualquier SO.
 */
export function validateProjectName(name: string): { valid: boolean; error?: string } {
  if (!name || !name.trim()) {
    return { valid: false, error: "El nombre del proyecto no puede estar vacío." };
  }

  const trimmed = name.trim();

  if (trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("..")) {
    return {
      valid: false,
      error: "El nombre del proyecto no puede contener barras ni rutas relativas ('..').",
    };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return {
      valid: false,
      error: "El nombre del proyecto solo puede contener letras, números, guiones y guiones bajos (ej: mi-video-01).",
    };
  }

  if (RESERVED_NAMES.test(trimmed)) {
    return {
      valid: false,
      error: `El nombre '${trimmed}' es una palabra reservada del sistema operativo.`,
    };
  }

  return { valid: true };
}

/**
 * Valida y normaliza el perfil de renderizado especificado.
 */
export function validateProfile(profile?: string): { valid: boolean; normalized: string; error?: string } {
  if (!profile || !profile.trim()) {
    return { valid: true, normalized: "tiktok" };
  }

  const normalized = profile.trim().toLowerCase();
  if (VALID_PROFILES.includes(normalized as any)) {
    return { valid: true, normalized };
  }

  return {
    valid: false,
    normalized,
    error: `Perfil '${profile}' no reconocido. Perfiles disponibles: [${VALID_PROFILES.join(", ")}].`,
  };
}

/**
 * Convierte un identificador en un título amigable con palabras capitalizadas.
 */
export function formatDefaultTitle(name: string): string {
  return name
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Parsea los argumentos de la línea de comandos para el generador.
 */
export function parseCliArgs(argv: string[]): CliArgs {
  const result: CliArgs = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--force" || arg === "-f") {
      result.force = true;
    } else if (arg === "--name" || arg === "-n") {
      result.name = argv[i + 1];
      i++;
    } else if (arg.startsWith("--name=")) {
      result.name = arg.split("=")[1];
    } else if (arg === "--profile" || arg === "-p") {
      result.profile = argv[i + 1];
      i++;
    } else if (arg.startsWith("--profile=")) {
      result.profile = arg.split("=")[1];
    } else if (arg === "--title" || arg === "-t") {
      result.title = argv[i + 1];
      i++;
    } else if (arg.startsWith("--title=")) {
      result.title = arg.substring("--title=".length);
    }
  }

  return result;
}

/**
 * Plantilla de letras sincronizadas Enhanced LRC para el proyecto inicial.
 */
export const LEAD_LRC_TEMPLATE = `[00:01.00] <00:01.00> Bienvenido <00:01.60> a <00:02.10> WebMov
[00:03.50] <00:03.50> Edita <00:04.00> tus <00:04.50> letras <00:05.00> aquí
[00:06.50] <00:06.50> Genera <00:07.10> videos <00:07.70> de <00:08.00> alta <00:08.50> calidad
`;

/**
 * Genera un proyecto WebMov en el directorio 'projects/<name>'.
 */
export function createProject(options: CreateProjectOptions): CreateProjectResult {
  const nameValidation = validateProjectName(options.name);
  if (!nameValidation.valid) {
    throw new Error(nameValidation.error);
  }

  const profileValidation = validateProfile(options.profile);
  if (!profileValidation.valid) {
    throw new Error(profileValidation.error);
  }

  const projectName = options.name.trim();
  const profile = profileValidation.normalized;
  const title = options.title?.trim() || formatDefaultTitle(projectName);

  const rootDir = options.rootDir || process.cwd();
  const projectDir = path.join(rootDir, "projects", projectName);

  if (fs.existsSync(projectDir)) {
    if (!options.force) {
      throw new Error(
        `El proyecto 'projects/${projectName}' ya existe. Use la bandera --force para sobrescribirlo.`
      );
    }
    fs.rmSync(projectDir, { recursive: true, force: true });
  }

  const sourcesDir = path.join(projectDir, "sources");
  const audioDir = path.join(sourcesDir, "audio");
  const lyricsDir = path.join(sourcesDir, "lyrics");
  const assetsDir = path.join(sourcesDir, "assets");

  fs.mkdirSync(audioDir, { recursive: true });
  fs.mkdirSync(lyricsDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });

  const rawConfig: ProjectConfig = {
    title,
    defaultProfile: profile,
    fps: 30,
    width: 1080,
    height: 1920,
    durationInFrames: 300,
    theme: {
      primaryColor: "#FFE600",
      secondaryColor: "#FF0055",
      backgroundColor: "#0A0A0A",
      fontFamily: "Inter, Montserrat, sans-serif",
    },
    subtitles: {
      tracks: [
        {
          trackId: "lead",
          position: { y: "62%" },
          fontSize: 56,
          primaryColor: "#FFE600",
          activeScale: 1.15,
        },
      ],
    },
    layers: {
      showSubtitles: true,
      showWaveform: true,
      showParticles: true,
      enable3D: false,
    },
  };

  // Validar con Zod para garantizar que la configuración generada cumpla 100% el esquema oficial
  const config = validateProjectConfig(rawConfig);

  const configPath = path.join(projectDir, "config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");

  const lyricsPath = path.join(lyricsDir, "lead.lrc");
  fs.writeFileSync(lyricsPath, LEAD_LRC_TEMPLATE, "utf-8");

  return {
    projectDir,
    configPath,
    lyricsPath,
    audioDir,
    assetsDir,
    config,
  };
}

/**
 * Lector de entrada asíncrono para prompts en terminal o streams de prueba.
 */
export class PromptReader {
  private rl: readline.Interface;
  private iterator: AsyncIterableIterator<string>;

  constructor(input: NodeJS.ReadableStream = process.stdin, output: NodeJS.WritableStream = process.stdout) {
    this.rl = readline.createInterface({
      input,
      output,
      terminal: (input as any).isTTY ?? false,
    });
    this.iterator = this.rl[Symbol.asyncIterator]();
  }

  async prompt(query: string): Promise<string> {
    process.stdout.write(query);
    const next = await this.iterator.next();
    if (next.done) {
      return "";
    }
    return next.value.trim();
  }

  close(): void {
    this.rl.close();
  }
}

/**
 * Ejecuta el diálogo interactivo para solicitar datos al usuario.
 */
export async function promptInteractive(
  customReader?: PromptReader
): Promise<{ name: string; profile: string; title: string }> {
  const reader = customReader || new PromptReader();
  const shouldClose = !customReader;

  try {
    let name = "";
    let attempts = 0;
    while (!name) {
      attempts++;
      if (attempts > 5) {
        throw new Error("No se pudo obtener un nombre válido de proyecto tras varios intentos.");
      }

      const answer = await reader.prompt("? Nombre del proyecto (ej: promo-single): ");
      if (!answer && !process.stdin.isTTY) {
        throw new Error("Entrada no interactiva sin nombre de proyecto especificado.");
      }

      const validation = validateProjectName(answer);
      if (!validation.valid) {
        console.log(`  ❌ ${validation.error}`);
      } else {
        name = answer;
      }
    }

    const defaultTitle = formatDefaultTitle(name);
    const titleAnswer = await reader.prompt(`? Título del video [${defaultTitle}]: `);
    const title = titleAnswer || defaultTitle;

    let profile = "tiktok";
    const profileAnswer = await reader.prompt(
      "? Perfil por defecto (1: tiktok [1080x1920 10M], 2: whatsapp [720x1280 2.8M]) [tiktok]: "
    );
    const trimmedProfile = profileAnswer.toLowerCase();
    if (trimmedProfile === "2" || trimmedProfile === "whatsapp") {
      profile = "whatsapp";
    } else if (trimmedProfile === "1" || trimmedProfile === "tiktok" || trimmedProfile === "") {
      profile = "tiktok";
    } else {
      const v = validateProfile(trimmedProfile);
      if (v.valid) {
        profile = v.normalized;
      } else {
        console.log(`  ⚠️ Perfil '${trimmedProfile}' desconocido. Se aplicará 'tiktok' por defecto.`);
        profile = "tiktok";
      }
    }

    return { name, profile, title };
  } finally {
    if (shouldClose) {
      reader.close();
    }
  }
}

export function printUsage(): void {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                   WebMov: Generador de Proyectos                      ║
╚═══════════════════════════════════════════════════════════════════════╝

Uso:
  npm run create-project -- [opciones]
  npm run new -- [opciones]

Opciones:
  --name, -n <nombre>     Nombre de la carpeta del proyecto en 'projects/' (requerido en modo CLI)
  --profile, -p <perfil>  Perfil predeterminado ('tiktok' o 'whatsapp', por defecto: 'tiktok')
  --title, -t <titulo>    Título visible del video
  --force, -f             Sobrescribe el proyecto si ya existe
  --help, -h              Muestra este mensaje de ayuda

Modo Interactivo:
  Si no se especifica '--name', se iniciará un asistente interactivo en la terminal.

Ejemplos:
  npm run create-project -- --name promo-verano --profile tiktok --title "Promo Verano 2026"
  npm run new -- --name audio-status --profile whatsapp
  npm run new
`);
}

export async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    process.exit(0);
  }

  let name = args.name;
  let profile = args.profile;
  let title = args.title;

  if (!name) {
    if (process.stdin.isTTY) {
      console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║            WebMov: Asistente Interactivo de Nuevo Proyecto            ║
╚═══════════════════════════════════════════════════════════════════════╝
`);
    }

    try {
      const interactive = await promptInteractive();
      name = interactive.name;
      profile = profile || interactive.profile;
      title = title || interactive.title;
    } catch {
      console.error(
        "❌ Error: Debe especificar el parámetro '--name <nombre>' o ejecutar en un terminal interactivo.\n"
      );
      printUsage();
      process.exit(1);
    }
  }

  const result = createProject({
    name: name!,
    profile,
    title,
    force: args.force,
  });

  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                   WebMov: Generador de Proyectos                      ║
╚═══════════════════════════════════════════════════════════════════════╝

✨ Proyecto '${name}' creado exitosamente!

📁 Estructura creada:
  - config.json (Perfil predeterminado: ${result.config.defaultProfile})
  - sources/audio/ (Coloque aquí su archivo de audio .mp3/.wav/.flac)
  - sources/lyrics/lead.lrc (Plantilla de letras sincronizadas)
  - sources/assets/ (Imágenes, videos y elementos gráficos)

🚀 Próximos pasos:
  1. Coloque su pista de audio en: projects/${name}/sources/audio/
  2. Ajuste las letras y tiempos en: projects/${name}/sources/lyrics/lead.lrc
  3. Prepare el proyecto: npm run prepare -- --project ${name}
  4. Previsualice en Remotion Studio: npm run start
  5. Renderice el video final: npm run render -- --project ${name}
`);
}

// Ejecutar main() cuando este script es el punto de entrada directo
const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFilePath)) {
  main().catch((err: any) => {
    console.error(`\n❌ Error: ${err.message}\n`);
    process.exit(1);
  });
}

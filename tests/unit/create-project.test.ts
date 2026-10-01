import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import {
  createProject,
  validateProjectName,
  validateProfile,
  formatDefaultTitle,
  parseCliArgs,
} from "../../scripts/create-project.js";
import { validateProjectConfig } from "../../src/config/schema.js";
import { parseLrcContent, processLyricsFile } from "../../scripts/prepare/lrc-parser.js";

describe("Módulo G: Generador de Proyectos WebMov (create-project.ts)", () => {
  const rootDir = process.cwd();
  let tmpProjectsDir: string;
  const createdTestProjects: string[] = [];

  beforeEach(() => {
    tmpProjectsDir = fs.mkdtempSync(path.join(os.tmpdir(), "webmov-generator-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpProjectsDir, { recursive: true, force: true });
    // Limpiar proyectos de prueba creados en la carpeta real de projects/
    for (const proj of createdTestProjects) {
      const projPath = path.join(rootDir, "projects", proj);
      if (fs.existsSync(projPath)) {
        fs.rmSync(projPath, { recursive: true, force: true });
      }
    }
    createdTestProjects.length = 0;
  });

  describe("1. Validación de Nombres de Proyecto (validateProjectName)", () => {
    it("Acepta nombres alfanuméricos válidos con guiones y guiones bajos", () => {
      expect(validateProjectName("promo-verano").valid).toBe(true);
      expect(validateProjectName("reel_2026").valid).toBe(true);
      expect(validateProjectName("Video01").valid).toBe(true);
      expect(validateProjectName("track-con-letras_v2").valid).toBe(true);
    });

    it("Rechaza nombres vacíos o solo espacios en blanco", () => {
      const emptyRes = validateProjectName("");
      expect(emptyRes.valid).toBe(false);
      expect(emptyRes.error).toContain("no puede estar vacío");

      const spaceRes = validateProjectName("   ");
      expect(spaceRes.valid).toBe(false);
      expect(spaceRes.error).toContain("no puede estar vacío");
    });

    it("Rechaza barras y rutas relativas (path traversal)", () => {
      expect(validateProjectName("../intruso").valid).toBe(false);
      expect(validateProjectName("carpeta/sub").valid).toBe(false);
      expect(validateProjectName("carpeta\\sub").valid).toBe(false);
    });

    it("Rechaza caracteres especiales o espacios no permitidos", () => {
      expect(validateProjectName("promo verano").valid).toBe(false);
      expect(validateProjectName("video@tiktok").valid).toBe(false);
      expect(validateProjectName("audio#1").valid).toBe(false);
      expect(validateProjectName("canción").valid).toBe(false);
    });

    it("Rechaza palabras reservadas del sistema operativo", () => {
      expect(validateProjectName("con").valid).toBe(false);
      expect(validateProjectName("PRN").valid).toBe(false);
      expect(validateProjectName("aux").valid).toBe(false);
      expect(validateProjectName("NUL").valid).toBe(false);
      expect(validateProjectName("com1").valid).toBe(false);
    });
  });

  describe("2. Validación y Normalización de Perfiles (validateProfile)", () => {
    it("Asigna 'tiktok' por defecto si el perfil es omitido o vacío", () => {
      expect(validateProfile(undefined)).toEqual({ valid: true, normalized: "tiktok" });
      expect(validateProfile("")).toEqual({ valid: true, normalized: "tiktok" });
      expect(validateProfile("   ")).toEqual({ valid: true, normalized: "tiktok" });
    });

    it("Acepta y normaliza perfiles válidos sin distinción de mayúsculas", () => {
      expect(validateProfile("tiktok")).toEqual({ valid: true, normalized: "tiktok" });
      expect(validateProfile("TikTok")).toEqual({ valid: true, normalized: "tiktok" });
      expect(validateProfile("TIKTOK")).toEqual({ valid: true, normalized: "tiktok" });
      expect(validateProfile("whatsapp")).toEqual({ valid: true, normalized: "whatsapp" });
      expect(validateProfile("WhatsApp")).toEqual({ valid: true, normalized: "whatsapp" });
    });

    it("Rechaza perfiles no soportados con mensaje descriptivo", () => {
      const res = validateProfile("youtube");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Perfil 'youtube' no reconocido");
      expect(res.error).toContain("tiktok, whatsapp");
    });
  });

  describe("3. Formateo de Títulos por Defecto (formatDefaultTitle)", () => {
    it("Formatea adecuadamente separadores a espacios y capitaliza", () => {
      expect(formatDefaultTitle("promo-single")).toBe("Promo Single");
      expect(formatDefaultTitle("summer_party_2026")).toBe("Summer Party 2026");
      expect(formatDefaultTitle("video")).toBe("Video");
    });
  });

  describe("4. Parseo de Argumentos CLI (parseCliArgs)", () => {
    it("Parsea correctamente argumentos con banderas cortas y largas", () => {
      const args1 = parseCliArgs([
        "--name",
        "mi-proyecto",
        "--profile",
        "whatsapp",
        "--title",
        "Mi Gran Video",
        "--force",
      ]);
      expect(args1.name).toBe("mi-proyecto");
      expect(args1.profile).toBe("whatsapp");
      expect(args1.title).toBe("Mi Gran Video");
      expect(args1.force).toBe(true);

      const args2 = parseCliArgs(["-n", "clip", "-p", "tiktok", "-t", "Clip 1", "-f"]);
      expect(args2.name).toBe("clip");
      expect(args2.profile).toBe("tiktok");
      expect(args2.title).toBe("Clip 1");
      expect(args2.force).toBe(true);
    });

    it("Parsea sintaxis de asignación con signo igual (=)", () => {
      const args = parseCliArgs([
        "--name=promo-clip",
        "--profile=whatsapp",
        "--title=Promo Clip 2026",
      ]);
      expect(args.name).toBe("promo-clip");
      expect(args.profile).toBe("whatsapp");
      expect(args.title).toBe("Promo Clip 2026");
    });

    it("Detecta bandera de ayuda (-h y --help)", () => {
      expect(parseCliArgs(["--help"]).help).toBe(true);
      expect(parseCliArgs(["-h"]).help).toBe(true);
    });
  });

  describe("5. Generación de Estructura de Proyecto (createProject)", () => {
    it("Genera estructura completa de carpetas, config.json y plantilla lead.lrc con perfil tiktok", () => {
      const result = createProject({
        name: "test-tiktok-proj",
        rootDir: tmpProjectsDir,
      });

      expect(fs.existsSync(result.projectDir)).toBe(true);
      expect(fs.existsSync(result.audioDir)).toBe(true);
      expect(fs.existsSync(result.lyricsPath)).toBe(true);
      expect(fs.existsSync(result.assetsDir)).toBe(true);
      expect(fs.existsSync(result.configPath)).toBe(true);

      // Validar contenido de config.json
      const rawConfig = JSON.parse(fs.readFileSync(result.configPath, "utf-8"));
      expect(rawConfig.title).toBe("Test Tiktok Proj");
      expect(rawConfig.defaultProfile).toBe("tiktok");
      expect(rawConfig.fps).toBe(30);
      expect(rawConfig.width).toBe(1080);
      expect(rawConfig.height).toBe(1920);
      expect(rawConfig.subtitles?.tracks?.[0]?.trackId).toBe("lead");

      // Validar que config.json cumple 100% con Zod schema
      const validated = validateProjectConfig(rawConfig);
      expect(validated.defaultProfile).toBe("tiktok");

      // Validar que la plantilla lead.lrc es sintácticamente correcta y procesable por el pipeline
      const lrcContent = fs.readFileSync(result.lyricsPath, "utf-8");
      const lines = parseLrcContent(lrcContent, "lead.lrc");
      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(lines[0].words.length).toBeGreaterThan(0);

      const trackData = processLyricsFile(result.lyricsPath, result.projectDir);
      expect(trackData._meta.trackId).toBe("lead");
      expect(trackData.lines.length).toBe(lines.length);
    });

    it("Genera proyecto con perfil whatsapp y título personalizado", () => {
      const result = createProject({
        name: "whatsapp-status",
        profile: "whatsapp",
        title: "Estado de WhatsApp Especial",
        rootDir: tmpProjectsDir,
      });

      const config = JSON.parse(fs.readFileSync(result.configPath, "utf-8"));
      expect(config.title).toBe("Estado de WhatsApp Especial");
      expect(config.defaultProfile).toBe("whatsapp");
    });

    it("Protección contra colisiones: arroja error al intentar crear proyecto existente sin --force", () => {
      createProject({
        name: "duplicado",
        rootDir: tmpProjectsDir,
      });

      expect(() =>
        createProject({
          name: "duplicado",
          rootDir: tmpProjectsDir,
          force: false,
        })
      ).toThrow(/El proyecto 'projects\/duplicado' ya existe\. Use la bandera --force/);
    });

    it("Sobrescribe exitosamente proyecto existente cuando force es true", () => {
      createProject({
        name: "sobreescribible",
        title: "Versión Original",
        profile: "tiktok",
        rootDir: tmpProjectsDir,
      });

      const result2 = createProject({
        name: "sobreescribible",
        title: "Versión Nueva",
        profile: "whatsapp",
        force: true,
        rootDir: tmpProjectsDir,
      });

      const updatedConfig = JSON.parse(fs.readFileSync(result2.configPath, "utf-8"));
      expect(updatedConfig.title).toBe("Versión Nueva");
      expect(updatedConfig.defaultProfile).toBe("whatsapp");
    });

    it("Arroja error si los parámetros name o profile no son válidos", () => {
      expect(() =>
        createProject({
          name: "nombre invalido con espacios",
          rootDir: tmpProjectsDir,
        })
      ).toThrow(/solo puede contener letras, números/);

      expect(() =>
        createProject({
          name: "valido",
          profile: "perfil-inexistente",
          rootDir: tmpProjectsDir,
        })
      ).toThrow(/Perfil 'perfil-inexistente' no reconocido/);
    });
  });

  describe("6. Pruebas de Ejecución CLI (scripts/create-project.ts)", () => {
    it("Muestra la ayuda interactiva con la bandera --help", () => {
      const output = execSync("npx tsx scripts/create-project.ts --help", {
        cwd: rootDir,
        stdio: ["ignore", "pipe", "pipe"],
      }).toString();

      expect(output).toContain("WebMov: Generador de Proyectos");
      expect(output).toContain("Uso:");
      expect(output).toContain("--name, -n");
      expect(output).toContain("--profile, -p");
    });

    it("Crea proyecto por CLI con banderas completas", () => {
      const projName = "cli-test-proj-01";
      createdTestProjects.push(projName);

      const output = execSync(
        `npx tsx scripts/create-project.ts --name ${projName} --profile whatsapp --title "Video CLI"`,
        {
          cwd: rootDir,
          stdio: ["ignore", "pipe", "pipe"],
        }
      ).toString();

      expect(output).toContain(`Proyecto '${projName}' creado exitosamente!`);
      expect(output).toContain("Perfil predeterminado: whatsapp");

      const configPath = path.join(rootDir, "projects", projName, "config.json");
      expect(fs.existsSync(configPath)).toBe(true);

      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(config.defaultProfile).toBe("whatsapp");
      expect(config.title).toBe("Video CLI");
    });

    it("Falla por CLI al intentar crear un proyecto que ya existe sin --force", () => {
      const projName = "cli-test-collision";
      createdTestProjects.push(projName);

      // Crear primero
      createProject({ name: projName });

      try {
        execSync(`npx tsx scripts/create-project.ts --name ${projName}`, {
          cwd: rootDir,
          stdio: ["ignore", "pipe", "pipe"],
        });
        expect.unreachable("Debería haber fallado con código 1");
      } catch (err: any) {
        const output = err.stderr ? err.stderr.toString() : err.stdout.toString();
        expect(output).toContain(`El proyecto 'projects/${projName}' ya existe`);
      }
    });

    it("Sobrescribe por CLI al usar la bandera --force", () => {
      const projName = "cli-test-force-overwrite";
      createdTestProjects.push(projName);

      createProject({ name: projName, profile: "tiktok" });

      const output = execSync(
        `npx tsx scripts/create-project.ts --name ${projName} --profile whatsapp --force`,
        {
          cwd: rootDir,
          stdio: ["ignore", "pipe", "pipe"],
        }
      ).toString();

      expect(output).toContain(`Proyecto '${projName}' creado exitosamente!`);

      const configPath = path.join(rootDir, "projects", projName, "config.json");
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(config.defaultProfile).toBe("whatsapp");
    });

    it("Ejecución interactiva emulada mediante entrada por tubería (stdin)", () => {
      const projName = "cli-interactive-pipe";
      createdTestProjects.push(projName);

      // Entrada simulada: nombre, título, perfil 2 (whatsapp)
      const simulatedInput = `${projName}\nVideo Interactivo Titulo\n2\n`;

      const output = execSync("npx tsx scripts/create-project.ts", {
        cwd: rootDir,
        input: simulatedInput,
        stdio: ["pipe", "pipe", "pipe"],
      }).toString();

      expect(output).toContain(`Proyecto '${projName}' creado exitosamente!`);

      const configPath = path.join(rootDir, "projects", projName, "config.json");
      expect(fs.existsSync(configPath)).toBe(true);
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(config.title).toBe("Video Interactivo Titulo");
      expect(config.defaultProfile).toBe("whatsapp");
    });

    it("Falla con mensaje instructivo si no se pasa --name en modo no interactivo sin entrada", () => {
      try {
        execSync("npx tsx scripts/create-project.ts", {
          cwd: rootDir,
          input: "",
          stdio: ["pipe", "pipe", "pipe"],
        });
        expect.unreachable("Debería haber fallado por falta de parámetros");
      } catch (err: any) {
        const output =
          (err.stderr ? err.stderr.toString() : "") +
          (err.stdout ? err.stdout.toString() : "") +
          (err.message || "");
        expect(output).toContain("Debe especificar el parámetro '--name <nombre>'");
      }
    });
  });
});

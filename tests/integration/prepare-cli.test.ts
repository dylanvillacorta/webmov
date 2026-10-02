import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

describe("Módulo C: Orquestador CLI y Motor de Caché (prepare-project.ts)", () => {
  const rootDir = process.cwd();

  it("PRE-01: Proyecto inexistente emite error instructivo con lista de disponibles", () => {
    try {
      execSync("npx tsx scripts/prepare-project.ts --project proyecto_fantasma", {
        cwd: rootDir,
        stdio: ["ignore", "pipe", "pipe"],
      });
      expect.unreachable("Debería haber fallado con exit code 1");
    } catch (err: any) {
      const output = err.stderr ? err.stderr.toString() : err.stdout.toString();
      expect(output).toContain("El proyecto 'projects/proyecto_fantasma' no existe");
      expect(output).toMatch(/Proyectos disponibles: \[.*sample.*\]/);
    }
  });

  it("PRE-02: Ejecución sin bandera --project muestra guía de uso en consola", () => {
    const output = execSync("npx tsx scripts/prepare-project.ts", {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
    }).toString();

    expect(output).toContain("Uso:");
    expect(output).toContain("npm run prepare -- --project <nombre_proyecto>");
  });

  it("PRE-04: Reejecución sin modificaciones produce omisión por caché (SKIP)", () => {
    // Primera ejecución para asegurar caché
    execSync("npx tsx scripts/prepare-project.ts --project sample", {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Segunda ejecución inmediata
    const secondRun = execSync("npx tsx scripts/prepare-project.ts --project sample", {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
    }).toString();

    expect(secondRun).toContain("⚡ Audio al día (SKIP)");
    expect(secondRun).toContain("⚡ Letra pista 'lead' al día (SKIP)");
    expect(secondRun).toContain("⚡ Letra pista 'backing' al día (SKIP)");
  });

  it("PRE-06: Bandera --force fuerza la regeneración completa", () => {
    const forceRun = execSync("npx tsx scripts/prepare-project.ts --project sample --force", {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
    }).toString();

    expect(forceRun).toContain("Audio analizado");
    expect(forceRun).toContain("Pista de letras 'lead' procesada");
    expect(forceRun).toContain("Pista de letras 'backing' procesada");
    expect(forceRun).not.toContain("⚡ Audio al día (SKIP)");
  });

  it("PRE-07: Preparación de proyecto 'make-you-mine' procesa audio y letras enhanced con timestamps por palabra", () => {
    const run = execSync("npx tsx scripts/prepare-project.ts --project make-you-mine", {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
    }).toString();

    expect(run).toContain("make-you-mine");
    const jsonPath = path.join(rootDir, "projects", "make-you-mine", "generated", "lyrics", "make you mine.json");
    expect(fs.existsSync(jsonPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    expect(data.lines.length).toBe(47);
    expect(data.lines[0].words.length).toBe(4);
    expect(data.lines[0].words[0].text).toBe("Make");
  });
});

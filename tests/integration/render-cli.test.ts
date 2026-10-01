import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

describe("Módulo F: CLI de Renderizado (render-video.ts)", () => {
  const rootDir = process.cwd();

  it("RND-01: Intento de renderizar un proyecto sin preparar arroja bloqueo informativo", () => {
    // Crear un proyecto temporal sin carpeta generated
    const tmpProjectDir = path.join(rootDir, "projects", "unprepared_demo");
    fs.mkdirSync(tmpProjectDir, { recursive: true });

    try {
      execSync("npx tsx scripts/render-video.ts --project unprepared_demo", {
        cwd: rootDir,
        stdio: ["ignore", "pipe", "pipe"],
      });
      expect.unreachable("Debería haber fallado con código 1");
    } catch (err: any) {
      const output = err.stderr ? err.stderr.toString() : err.stdout.toString();
      expect(output).toContain("El proyecto no ha sido preparado");
      expect(output).toContain("npm run prepare -- --project unprepared_demo");
    } finally {
      fs.rmSync(tmpProjectDir, { recursive: true, force: true });
    }
  });

  it("RND-02: Perfil desconocido arroja error instructivo", () => {
    try {
      execSync("npx tsx scripts/render-video.ts --project sample --profile inexistente", {
        cwd: rootDir,
        stdio: ["ignore", "pipe", "pipe"],
      });
      expect.unreachable("Debería haber fallado con código 1");
    } catch (err: any) {
      const output = err.stderr ? err.stderr.toString() : err.stdout.toString();
      expect(output).toContain("El perfil 'inexistente' no existe");
      expect(output).toContain("Perfiles válidos: [tiktok, whatsapp]");
    }
  });

  it("RND-07: Utiliza projectConfig.defaultProfile cuando no se pasa --profile", () => {
    const tmpProjectDir = path.join(rootDir, "projects", "profile_test_project");
    fs.mkdirSync(path.join(tmpProjectDir, "generated"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpProjectDir, "generated", "audio-analysis.json"),
      JSON.stringify({ _meta: {}, frames: [] })
    );
    fs.writeFileSync(
      path.join(tmpProjectDir, "config.json"),
      JSON.stringify({ defaultProfile: "perfil_invalido_desde_config" })
    );

    try {
      execSync("npx tsx scripts/render-video.ts --project profile_test_project", {
        cwd: rootDir,
        stdio: ["ignore", "pipe", "pipe"],
      });
      expect.unreachable("Debería haber fallado al usar defaultProfile inválido del config.json");
    } catch (err: any) {
      const output = err.stderr ? err.stderr.toString() : err.stdout.toString();
      expect(output).toContain("El perfil 'perfil_invalido_desde_config' no existe");
    } finally {
      fs.rmSync(tmpProjectDir, { recursive: true, force: true });
    }
  });
});

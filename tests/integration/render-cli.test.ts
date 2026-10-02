import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

describe("Módulo F: CLI de Renderizado (render-video.ts)", () => {
  const rootDir = process.cwd();

  function getLatestExport(projectName: string): string {
    const exportsDir = path.join(rootDir, "projects", projectName, "exports");
    const mp4Files = fs
      .readdirSync(exportsDir)
      .filter((f) => f.endsWith(".mp4"))
      .sort((a, b) => fs.statSync(path.join(exportsDir, b)).mtimeMs - fs.statSync(path.join(exportsDir, a)).mtimeMs);
    return path.join(exportsDir, mp4Files[0]);
  }

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

  it("RND-08: Muestra sección 'Control de Duracion / Rango' y banderas en printUsage()", () => {
    const output = execSync("npx tsx scripts/render-video.ts --help", {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
    }).toString();

    expect(output).toContain("Control de Duracion / Rango");
    expect(output).toContain("--seconds");
    expect(output).toContain("-s");
    expect(output).toContain("--frames");
    expect(output).toContain("--range");
  });

  it("RND-09: Renderizado parcial por segundos (--seconds o -s) procesa solo la duración indicada", () => {
    const output = execSync("npx tsx scripts/render-video.ts --project sample --seconds 1", {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
    }).toString();

    expect(output).toContain("✂️ Rango parcial aplicado: cuadros [0, 29] (30 cuadros / 1.00s)");
    expect(output).toContain("🎞️ Renderizando 30 cuadros (rango: 0-29)");
    expect(output).toContain("Cuadro 30/30");
    expect(output).toContain("Exportación completada con éxito");

    const latestVideo = getLatestExport("sample");
    const probe = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames,duration -of default=noprint_wrappers=1 "${latestVideo}"`,
      { stdio: ["ignore", "pipe", "pipe"] }
    ).toString();

    expect(probe).toContain("nb_frames=30");
    expect(probe).toContain("duration=1.000000");
  }, 45000);

  it("RND-10: Renderizado parcial por rango (--range) procesa exactamente los cuadros solicitados", () => {
    const output = execSync("npx tsx scripts/render-video.ts --project sample --range 15-44", {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
    }).toString();

    expect(output).toContain("✂️ Rango parcial aplicado: cuadros [15, 44] (30 cuadros / 1.00s)");
    expect(output).toContain("🎞️ Renderizando 30 cuadros (rango: 15-44)");
    expect(output).toContain("Cuadro 30/30");
    expect(output).toContain("Exportación completada con éxito");

    const latestVideo = getLatestExport("sample");
    const probe = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of default=noprint_wrappers=1 "${latestVideo}"`,
      { stdio: ["ignore", "pipe", "pipe"] }
    ).toString();

    expect(probe).toContain("nb_frames=30");
  }, 45000);

  it("RND-11: Renderizado parcial por cuadros (--frames) procesa la cantidad solicitada", () => {
    const output = execSync("npx tsx scripts/render-video.ts --project sample --frames 15", {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
    }).toString();

    expect(output).toContain("✂️ Rango parcial aplicado: cuadros [0, 14] (15 cuadros / 0.50s)");
    expect(output).toContain("🎞️ Renderizando 15 cuadros (rango: 0-14)");
    expect(output).toContain("Cuadro 15/15");
    expect(output).toContain("Exportación completada con éxito");

    const latestVideo = getLatestExport("sample");
    const probe = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of default=noprint_wrappers=1 "${latestVideo}"`,
      { stdio: ["ignore", "pipe", "pipe"] }
    ).toString();

    expect(probe).toContain("nb_frames=15");
  }, 45000);

  it("RND-12: Error ante formato de rango inválido en --range", () => {
    try {
      execSync("npx tsx scripts/render-video.ts --project sample --range formato_invalido", {
        cwd: rootDir,
        stdio: ["ignore", "pipe", "pipe"],
      });
      expect.unreachable("Debería haber fallado con código 1");
    } catch (err: any) {
      const output = err.stderr ? err.stderr.toString() : err.stdout.toString();
      expect(output).toContain("El formato de '--range' es inválido");
    }
  });

  it("RND-13: Error ante rango invertido (inicio > fin)", () => {
    try {
      execSync("npx tsx scripts/render-video.ts --project sample --range 50-20", {
        cwd: rootDir,
        stdio: ["ignore", "pipe", "pipe"],
      });
      expect.unreachable("Debería haber fallado con código 1");
    } catch (err: any) {
      const output = err.stderr ? err.stderr.toString() : err.stdout.toString();
      expect(output).toContain("el cuadro de inicio (50) no puede ser mayor al cuadro de fin (20)");
    }
  });

  it("RND-14: Error ante rango o duración que excede los límites de la composición", () => {
    // Rango fuera de límites
    try {
      execSync("npx tsx scripts/render-video.ts --project sample --range 0-9999", {
        cwd: rootDir,
        stdio: ["ignore", "pipe", "pipe"],
      });
      expect.unreachable("Debería haber fallado con código 1");
    } catch (err: any) {
      const output = err.stderr ? err.stderr.toString() : err.stdout.toString();
      expect(output).toContain("excede la duración total de la composición");
    }

    // Segundos fuera de límites
    try {
      execSync("npx tsx scripts/render-video.ts --project sample --seconds 999", {
        cwd: rootDir,
        stdio: ["ignore", "pipe", "pipe"],
      });
      expect.unreachable("Debería haber fallado con código 1");
    } catch (err: any) {
      const output = err.stderr ? err.stderr.toString() : err.stdout.toString();
      expect(output).toContain("excede la duración total de la composición");
    }
  }, 45000);

  it("RND-15: Error ante valores negativos o inválidos en --seconds y --frames", () => {
    try {
      execSync("npx tsx scripts/render-video.ts --project sample --seconds -5", {
        cwd: rootDir,
        stdio: ["ignore", "pipe", "pipe"],
      });
      expect.unreachable("Debería haber fallado con código 1");
    } catch (err: any) {
      const output = err.stderr ? err.stderr.toString() : err.stdout.toString();
      expect(output).toContain("El parámetro '--seconds' debe ser un número positivo mayor a 0");
    }

    try {
      execSync("npx tsx scripts/render-video.ts --project sample --frames -10", {
        cwd: rootDir,
        stdio: ["ignore", "pipe", "pipe"],
      });
      expect.unreachable("Debería haber fallado con código 1");
    } catch (err: any) {
      const output = err.stderr ? err.stderr.toString() : err.stdout.toString();
      expect(output).toContain("El parámetro '--frames' debe ser un número entero positivo mayor a 0");
    }
  });

  it("RND-16: Error al combinar múltiples opciones de control de duración/rango", () => {
    try {
      execSync("npx tsx scripts/render-video.ts --project sample --seconds 2 --range 0-30", {
        cwd: rootDir,
        stdio: ["ignore", "pipe", "pipe"],
      });
      expect.unreachable("Debería haber fallado con código 1");
    } catch (err: any) {
      const output = err.stderr ? err.stderr.toString() : err.stdout.toString();
      expect(output).toContain("No se pueden combinar las opciones '--seconds', '--frames' o '--range'");
    }
  });

  it("RND-17: Al omitir flags de rango se renderiza la totalidad del video calculando duración y dimensiones desde config.json", () => {
    const tmpProjectDir = path.join(rootDir, "projects", "dynamic_config_test");
    fs.mkdirSync(path.join(tmpProjectDir, "generated"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpProjectDir, "config.json"),
      JSON.stringify({
        durationInFrames: 12,
        fps: 30,
        width: 720,
        height: 1280,
      })
    );
    fs.writeFileSync(
      path.join(tmpProjectDir, "generated", "audio-analysis.json"),
      JSON.stringify({
        _meta: {
          generator: "webmov-audio-analyzer",
          schemaVersion: "1.0.0",
          frameCount: 60,
          fps: 30,
        },
        frames: [],
      })
    );

    try {
      const output = execSync("npx tsx scripts/render-video.ts --project dynamic_config_test", {
        cwd: rootDir,
        stdio: ["ignore", "pipe", "pipe"],
      }).toString();

      expect(output).toContain("🎞️ Renderizando 12 cuadros (720x1280 @ 30 FPS)...");
      expect(output).toContain("Cuadro 12/12");
      expect(output).toContain("Exportación completada con éxito");

      const latestVideo = getLatestExport("dynamic_config_test");
      const probe = execSync(
        `ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames,width,height -of default=noprint_wrappers=1 "${latestVideo}"`,
        { stdio: ["ignore", "pipe", "pipe"] }
      ).toString();

      expect(probe).toContain("nb_frames=12");
      expect(probe).toContain("width=720");
      expect(probe).toContain("height=1280");
    } finally {
      fs.rmSync(tmpProjectDir, { recursive: true, force: true });
    }
  }, 60000);

  it("RND-18: Al omitir flags de rango se calcula la duración dinámicamente desde audioAnalysis._meta.frameCount cuando config.durationInFrames no está definido", () => {
    const tmpProjectDir = path.join(rootDir, "projects", "dynamic_meta_test");
    fs.mkdirSync(path.join(tmpProjectDir, "generated"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpProjectDir, "config.json"),
      JSON.stringify({
        fps: 30,
      })
    );
    fs.writeFileSync(
      path.join(tmpProjectDir, "generated", "audio-analysis.json"),
      JSON.stringify({
        _meta: {
          generator: "webmov-audio-analyzer",
          schemaVersion: "1.0.0",
          frameCount: 15,
          fps: 30,
        },
        frames: [],
      })
    );

    try {
      const output = execSync("npx tsx scripts/render-video.ts --project dynamic_meta_test", {
        cwd: rootDir,
        stdio: ["ignore", "pipe", "pipe"],
      }).toString();

      expect(output).toContain("🎞️ Renderizando 15 cuadros (1080x1920 @ 30 FPS)...");
      expect(output).toContain("Cuadro 15/15");
      expect(output).toContain("Exportación completada con éxito");

      const latestVideo = getLatestExport("dynamic_meta_test");
      const probe = execSync(
        `ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames,width,height -of default=noprint_wrappers=1 "${latestVideo}"`,
        { stdio: ["ignore", "pipe", "pipe"] }
      ).toString();

      expect(probe).toContain("nb_frames=15");
      expect(probe).toContain("width=1080");
      expect(probe).toContain("height=1920");
    } finally {
      fs.rmSync(tmpProjectDir, { recursive: true, force: true });
    }
  }, 60000);

  it("RND-19: Validación de límites de rango utiliza la duración calculada dinámicamente para el proyecto", () => {
    const tmpProjectDir = path.join(rootDir, "projects", "dynamic_limit_test");
    fs.mkdirSync(path.join(tmpProjectDir, "generated"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpProjectDir, "config.json"),
      JSON.stringify({
        durationInFrames: 20,
        fps: 30,
      })
    );
    fs.writeFileSync(
      path.join(tmpProjectDir, "generated", "audio-analysis.json"),
      JSON.stringify({
        _meta: {
          generator: "webmov-audio-analyzer",
          schemaVersion: "1.0.0",
          frameCount: 20,
          fps: 30,
        },
        frames: [],
      })
    );

    try {
      execSync("npx tsx scripts/render-video.ts --project dynamic_limit_test --frames 25", {
        cwd: rootDir,
        stdio: ["ignore", "pipe", "pipe"],
      });
      expect.unreachable("Debería haber fallado al exceder 20 cuadros");
    } catch (err: any) {
      const output = err.stderr ? err.stderr.toString() : err.stdout.toString();
      expect(output).toContain(
        "La cantidad de cuadros solicitada (25) excede la duración total de la composición (20 cuadros)."
      );
    } finally {
      fs.rmSync(tmpProjectDir, { recursive: true, force: true });
    }
  }, 45000);
});

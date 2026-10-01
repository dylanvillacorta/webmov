import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

describe("Suite End-to-End: Pipeline Completo (full-pipeline.test.ts)", () => {
  const rootDir = process.cwd();

  it("Ejecuta pipeline completo: prepare -> render tiktok -> inspección ffprobe", () => {
    // 1. Ejecutar Prepare
    const prepareOutput = execSync("npx tsx scripts/prepare-project.ts --project sample", {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
    }).toString();
    expect(prepareOutput).toContain("Preparación de [sample] completada con éxito");

    // 2. Verificar archivos de caché generados
    const sampleDir = path.join(rootDir, "projects", "sample");
    const audioAnalysisPath = path.join(sampleDir, "generated", "audio-analysis.json");
    const leadLyricsPath = path.join(sampleDir, "generated", "lyrics", "lead.json");
    const backingLyricsPath = path.join(sampleDir, "generated", "lyrics", "backing.json");

    expect(fs.existsSync(audioAnalysisPath)).toBe(true);
    expect(fs.existsSync(leadLyricsPath)).toBe(true);
    expect(fs.existsSync(backingLyricsPath)).toBe(true);

    const audioData = JSON.parse(fs.readFileSync(audioAnalysisPath, "utf-8"));
    expect(audioData._meta.schemaVersion).toBe("1.0.0");
    expect(audioData.frames.length).toBe(300);

    // 3. Ejecutar Render con perfil tiktok y override de bitrate
    const renderOutput = execSync(
      "npx tsx scripts/render-video.ts --project sample --profile tiktok --bitrate 12M",
      {
        cwd: rootDir,
        stdio: ["ignore", "pipe", "pipe"],
      }
    ).toString();
    expect(renderOutput).toContain("Exportación completada con éxito");

    // 4. Localizar el video más reciente en exports
    const exportsDir = path.join(sampleDir, "exports");
    const mp4Files = fs
      .readdirSync(exportsDir)
      .filter((f) => f.endsWith(".mp4"))
      .sort((a, b) => fs.statSync(path.join(exportsDir, b)).mtimeMs - fs.statSync(path.join(exportsDir, a)).mtimeMs);

    expect(mp4Files.length).toBeGreaterThan(0);
    const latestVideo = path.join(exportsDir, mp4Files[0]);

    // 5. Inspeccionar metadatos con ffprobe
    const probeOutput = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,color_space,color_primaries,color_transfer,color_range -of default=noprint_wrappers=1 "${latestVideo}"`,
      {
        stdio: ["ignore", "pipe", "pipe"],
      }
    ).toString();

    expect(probeOutput).toContain("width=1080");
    expect(probeOutput).toContain("height=1920");
    expect(probeOutput).toContain("color_space=bt709");
    expect(probeOutput).toContain("color_primaries=bt709");
    expect(probeOutput).toContain("color_transfer=bt709");
    expect(probeOutput).toContain("color_range=tv");
  });
});

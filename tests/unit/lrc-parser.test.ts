import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { parseLrcContent, processLyricsFile, timestampToMs } from "../../scripts/prepare/lrc-parser.js";

describe("Módulo B: Parser de Letras Multi-Pista (lrc-parser.ts)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "webmov-lrc-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("timestampToMs convierte marcas estándar correctamente a ms", () => {
    expect(timestampToMs("[01:23.45]", "test.lrc", 1)).toBe(83450);
    expect(timestampToMs("<00:02.50>", "test.lrc", 1)).toBe(2500);
    expect(timestampToMs("[00:00.00]", "test.lrc", 1)).toBe(0);
  });

  it("LRC-01: Arroja error pedagógico con sintaxis de timestamp rota", () => {
    const brokenLrc = `[00:01.00] Primera linea\n[99:99] Tag roto\n[00:05.00] Tercera linea`;
    expect(() => parseLrcContent(brokenLrc, "lead.lrc")).toThrow(
      /Error de sintaxis en 'lead.lrc', Línea 2/
    );
  });

  it("LRC-02: Arroja error pedagógico ante inversión temporal de palabra", () => {
    const invertedLrc = `[00:10.00] <00:10.00> hola <00:05.00> mundo`;
    expect(() => parseLrcContent(invertedLrc, "lead.lrc")).toThrow(
      /Error temporal en 'lead.lrc', Línea 1: La palabra 'hola' finaliza antes de comenzar/
    );
  });

  it("LRC-03: Arroja error pedagógico ante JSON externo malformado", () => {
    const jsonPath = path.join(tmpDir, "whisper.json");
    fs.writeFileSync(jsonPath, "{ lines: [ { id: 1, text: 'incompleto', } ] }"); // JSON inválido

    expect(() => processLyricsFile(jsonPath, tmpDir)).toThrow(/Error de sintaxis JSON en 'whisper.json'/);
  });

  it("LRC-04: LRC tradicional sin marcas <> interpola duraciones automáticamente", () => {
    const traditionalLrc = `[00:02.00] Frase completa cantada con ritmo\n[00:06.00] Segunda linea`;
    const lines = parseLrcContent(traditionalLrc, "trad.lrc");

    expect(lines.length).toBe(2);
    expect(lines[0].words.length).toBe(5);
    expect(lines[0].words[0].text).toBe("Frase");
    expect(lines[0].words[0].startMs).toBe(2000);
    // Cada palabra tiene duración positiva y secuencial
    for (let i = 0; i < lines[0].words.length - 1; i++) {
      expect(lines[0].words[i].startMs).toBeLessThan(lines[0].words[i + 1].startMs);
      expect(lines[0].words[i].endMs).toBeLessThanOrEqual(lines[0].words[i + 1].startMs);
    }
  });

  it("LRC-06: Ignora líneas vacías y comentarios ID3 sin desfasar líneas", () => {
    const lrcWithSpaces = `
      [ti: Song Title]
      [ar: Artist]

      [00:01.00] <00:01.00> Uno <00:02.00> Dos

      [00:03.00] <00:03.00> Tres <00:04.00> Cuatro
    `;
    const lines = parseLrcContent(lrcWithSpaces, "spaces.lrc");
    expect(lines.length).toBe(2);
    expect(lines[0].words.length).toBe(2);
    expect(lines[1].words.length).toBe(2);
  });

  it("LRC-07: Pista con nombre 'track.lrc' se normaliza a trackId 'main' con schemaVersion 1.0.0", () => {
    const lrcPath = path.join(tmpDir, "track.lrc");
    fs.writeFileSync(lrcPath, "[00:01.00] <00:01.00> Hola <00:02.00> Mundo");

    const trackData = processLyricsFile(lrcPath, tmpDir);
    expect(trackData._meta.trackId).toBe("main");
    expect(trackData._meta.schemaVersion).toBe("1.0.0");
    expect(trackData._meta.generator).toBe("webmov");
    expect(trackData.lines.length).toBe(1);
  });

  it("LRC-09: Conserva caracteres UTF-8, tildes y caracteres especiales intactos", () => {
    const utf8Lrc = `[00:01.00] <00:01.00> ¡Canción <00:02.00> en <00:02.50> español! <00:03.00> 🚀`;
    const lines = parseLrcContent(utf8Lrc, "utf8.lrc");

    expect(lines[0].text).toContain("¡Canción en español! 🚀");
    expect(lines[0].words[0].text).toBe("¡Canción");
    expect(lines[0].words[3].text).toBe("🚀");
  });
});

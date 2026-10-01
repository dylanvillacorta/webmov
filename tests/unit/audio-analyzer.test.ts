import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  computeFFT,
  analyzePcmBuffer,
  findProjectAudioFile,
  analyzeAudio,
} from "../../scripts/prepare/audio-analyzer.js";
import { generateTestWav } from "../helpers/audio-generator.js";

describe("Módulo A: Ingesta y Análisis de Audio (audio-analyzer.ts)", () => {
  let tmpDir: string;
  let audioDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "webmov-audio-test-"));
    audioDir = path.join(tmpDir, "sources", "audio");
    fs.mkdirSync(audioDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("computeFFT calcula transformada de Fourier determinista en buffer normalizado", () => {
    const n = 2048;
    const input = new Float32Array(n);
    // Seno de 10 ciclos dentro de 2048 puntos (bin 10)
    for (let i = 0; i < n; i++) {
      input[i] = Math.sin((2 * Math.PI * 10 * i) / n);
    }

    const magnitudes = computeFFT(input);
    expect(magnitudes.length).toBe(1024);
    // El bin 10 debe tener la magnitud pico
    expect(magnitudes[10]).toBeGreaterThan(0.8);
    expect(magnitudes[0]).toBeLessThan(0.05);
    expect(magnitudes[50]).toBeLessThan(0.05);
  });

  it("AUD-02: Archivo de 0 bytes arroja error controlado", () => {
    const emptyFile = path.join(audioDir, "empty.wav");
    fs.writeFileSync(emptyFile, Buffer.alloc(0));

    expect(() => analyzeAudio(emptyFile, tmpDir)).toThrow(/El archivo de audio está vacío \(0 bytes\)/);
  });

  it("AUD-04: Carpeta de audio vacía arroja guía al usuario", () => {
    expect(() => findProjectAudioFile(tmpDir)).toThrow(
      /No se encontró ningún archivo de audio en 'sources\/audio\/'. Agregue una pista en formato .mp3, .wav o .flac/
    );
  });

  it("AUD-05: Múltiples audios ambiguos arroja colisión explicativa", () => {
    fs.writeFileSync(path.join(audioDir, "track1.mp3"), Buffer.from("audio"));
    fs.writeFileSync(path.join(audioDir, "track2.wav"), Buffer.from("audio"));

    expect(() => findProjectAudioFile(tmpDir)).toThrow(
      /Se detectaron múltiples archivos de audio. Especifique el archivo principal o mantenga solo uno/
    );
  });

  it("AUD-06: Audio ultracorto genera al menos 1 frame sin división por cero ni NaN", () => {
    const tinyBuffer = Buffer.alloc(100); // ~50 samples
    const frames = analyzePcmBuffer(tinyBuffer, 44100, 30);

    expect(frames.length).toBe(1);
    expect(Number.isNaN(frames[0].rms)).toBe(false);
    expect(Number.isNaN(frames[0].bass)).toBe(false);
  });

  it("AUD-07: Audio en silencio absoluto genera RMS=0 y valores no NaN", () => {
    const silentFile = path.join(audioDir, "silence.wav");
    generateTestWav({
      filePath: silentFile,
      durationSeconds: 1,
      sampleRate: 44100,
      frequencyHz: 0,
    });

    const analysis = analyzeAudio(silentFile, tmpDir, 30);
    expect(analysis.frames.length).toBe(30);

    for (const frame of analysis.frames) {
      expect(frame.rms).toBe(0);
      expect(frame.bass).toBe(0);
      expect(frame.mid).toBe(0);
      expect(frame.treble).toBe(0);
      expect(frame.isBeat).toBe(false);
    }
  });

  it("AUD-10: Tono puro de 100 Hz concentra la energía espectral en 'bass'", () => {
    const bassToneFile = path.join(audioDir, "bass_100hz.wav");
    generateTestWav({
      filePath: bassToneFile,
      durationSeconds: 1,
      sampleRate: 44100,
      frequencyHz: 100,
    });

    const analysis = analyzeAudio(bassToneFile, tmpDir, 30);
    expect(analysis.frames.length).toBe(30);

    // Los frames intermedios deben tener bass significativamente mayor que mid y treble
    const midFrame = analysis.frames[15];
    expect(midFrame.bass).toBeGreaterThan(0.5);
    expect(midFrame.treble).toBe(0);
  });
});

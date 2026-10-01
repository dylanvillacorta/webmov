import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";
import type { AudioAnalysisData, AudioAnalysisFrame, MetaHeader } from "../../src/types/index.js";

/**
 * Implementación pura en TypeScript del algoritmo FFT Radix-2 (Cooley-Tukey).
 * Determinista, sin dependencias nativas y optimizado para análisis frame-a-frame.
 */
export function computeFFT(realInput: Float32Array): Float32Array {
  const n = realInput.length;
  // n debe ser potencia de 2 (ej. 2048)
  const real = new Float32Array(n);
  const imag = new Float32Array(n);

  real.set(realInput);

  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tempR = real[i];
      real[i] = real[j];
      real[j] = tempR;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // Cooley-Tukey Radix-2
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wR = 1;
      let wI = 0;
      for (let k = 0; k < halfLen; k++) {
        const pos = i + k;
        const matchPos = pos + halfLen;

        const uR = real[pos];
        const uI = imag[pos];

        const tR = real[matchPos] * wR - imag[matchPos] * wI;
        const tI = real[matchPos] * wI + imag[matchPos] * wR;

        real[pos] = uR + tR;
        imag[pos] = uI + tI;
        real[matchPos] = uR - tR;
        imag[matchPos] = uI - tI;

        const nextWR = wR * wStepR - wI * wStepI;
        const nextWI = wR * wStepI + wI * wStepR;
        wR = nextWR;
        wI = nextWI;
      }
    }
  }

  // Magnitud espectral normalizada
  const magnitudes = new Float32Array(n / 2);
  const normFactor = 2 / n;
  for (let i = 0; i < n / 2; i++) {
    magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) * normFactor;
  }

  return magnitudes;
}

/**
 * Analiza un buffer PCM de 16-bit mono a 44100 Hz y genera los cuadros de análisis a 30 FPS.
 */
export function analyzePcmBuffer(pcmBuffer: Buffer, sampleRate = 44100, fps = 30): AudioAnalysisFrame[] {
  const numSamples = Math.floor(pcmBuffer.length / 2);
  const samplesPerFrame = Math.floor(sampleRate / fps); // 1470 samples por cuadro a 44100Hz y 30FPS
  const totalFrames = Math.max(1, Math.ceil(numSamples / samplesPerFrame));

  // Convertir Buffer de enteros con signo a Float32Array normalizado (-1.0 a 1.0)
  const floatSamples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    floatSamples[i] = pcmBuffer.readInt16LE(i * 2) / 32768.0;
  }

  const fftSize = 2048;
  const fftWindow = new Float32Array(fftSize);
  const binResolution = sampleRate / fftSize; // ~21.53 Hz por bin

  // Rango de índices para las bandas
  // Bass: 20 Hz - 250 Hz (bins ~1 a 11)
  const bassStartBin = Math.max(1, Math.floor(20 / binResolution));
  const bassEndBin = Math.min(Math.floor(250 / binResolution), fftSize / 2 - 1);

  // Mid: 250 Hz - 4000 Hz (bins ~12 a 185)
  const midStartBin = bassEndBin + 1;
  const midEndBin = Math.min(Math.floor(4000 / binResolution), fftSize / 2 - 1);

  // Treble: 4000 Hz - 20000 Hz (bins ~186 a 928)
  const trebleStartBin = midEndBin + 1;
  const trebleEndBin = Math.min(Math.floor(20000 / binResolution), fftSize / 2 - 1);

  const frames: AudioAnalysisFrame[] = [];
  const energyHistory: number[] = [];
  let lastBeatFrame = -10;

  for (let f = 0; f < totalFrames; f++) {
    const frameStartSample = f * samplesPerFrame;
    const frameEndSample = Math.min(frameStartSample + samplesPerFrame, numSamples);

    // 1. Cálculo de RMS (Energía promedio del frame)
    let sumSquares = 0;
    const count = frameEndSample - frameStartSample;
    if (count > 0) {
      for (let s = frameStartSample; s < frameEndSample; s++) {
        const val = floatSamples[s];
        sumSquares += val * val;
      }
    }
    const rms = count > 0 ? Math.min(1.0, Math.sqrt(sumSquares / count)) : 0;

    // 2. Preparar ventana FFT con Hann Window
    fftWindow.fill(0);
    const windowLength = Math.min(fftSize, numSamples - frameStartSample);
    for (let i = 0; i < windowLength; i++) {
      const sampleIdx = frameStartSample + i;
      if (sampleIdx < numSamples) {
        // Hann window
        const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
        fftWindow[i] = floatSamples[sampleIdx] * hann;
      }
    }

    // 3. Ejecutar FFT
    const magnitudes = computeFFT(fftWindow);

    // 4. Calcular energía por bandas
    const computeBandEnergy = (start: number, end: number): number => {
      let energy = 0;
      for (let b = start; b <= end; b++) {
        energy += magnitudes[b] * magnitudes[b];
      }
      return Math.min(1.0, Math.sqrt(energy) * 2.5);
    };

    const bass = computeBandEnergy(bassStartBin, bassEndBin);
    const mid = computeBandEnergy(midStartBin, midEndBin);
    const treble = computeBandEnergy(trebleStartBin, trebleEndBin);

    // 5. Detección de Transitorios de Ritmo (Beats)
    const frameEnergy = rms * 0.4 + bass * 0.6;
    energyHistory.push(frameEnergy);
    if (energyHistory.length > 20) {
      energyHistory.shift();
    }

    const avgEnergy = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length;
    let isBeat = false;

    if (
      frameEnergy > avgEnergy * 1.35 &&
      frameEnergy > 0.05 &&
      f - lastBeatFrame >= 4 // Debounce de ~133 ms para evitar dobles disparos
    ) {
      isBeat = true;
      lastBeatFrame = f;
    }

    frames.push({
      frame: f,
      rms: Number(rms.toFixed(4)),
      bass: Number(bass.toFixed(4)),
      mid: Number(mid.toFixed(4)),
      treble: Number(treble.toFixed(4)),
      isBeat,
    });
  }

  return frames;
}

/**
 * Decodifica cualquier formato de audio compatible con FFmpeg a PCM 44.1kHz 16-bit mono en memoria.
 */
export function decodeAudioFileToPcm(audioFilePath: string, relativePath: string): Buffer {
  if (!fs.existsSync(audioFilePath)) {
    throw new Error(
      `No se encontró el archivo de audio '${relativePath}'. Verifique que exista en la carpeta 'sources/audio/'.`
    );
  }

  const stats = fs.statSync(audioFilePath);
  if (stats.size === 0) {
    throw new Error(`El archivo de audio está vacío (0 bytes).`);
  }

  try {
    const pcmBuffer = execSync(
      `ffmpeg -y -v error -i "${audioFilePath}" -f s16le -acodec pcm_s16le -ac 1 -ar 44100 pipe:1`,
      {
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 150 * 1024 * 1024,
      }
    );
    return pcmBuffer;
  } catch (err: any) {
    const stderr = err.stderr ? err.stderr.toString() : "";
    throw new Error(
      `El archivo de audio '${relativePath}' está dañado o no es un contenedor válido. Verifique el archivo.\nDetalle técnico: ${stderr || err.message}`
    );
  }
}

/**
 * Detecta y valida el archivo de audio dentro de `sources/audio/`.
 */
export function findProjectAudioFile(projectDir: string): { fullPath: string; relativePath: string } {
  const audioDir = path.join(projectDir, "sources", "audio");

  if (!fs.existsSync(audioDir)) {
    throw new Error(
      `No se encontró ningún archivo de audio en 'sources/audio/'. Agregue una pista en formato .mp3, .wav o .flac para continuar.`
    );
  }

  const supportedExtensions = [".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg"];
  const files = fs
    .readdirSync(audioDir)
    .filter((f) => supportedExtensions.includes(path.extname(f).toLowerCase()));

  if (files.length === 0) {
    throw new Error(
      `No se encontró ningún archivo de audio en 'sources/audio/'. Agregue una pista en formato .mp3, .wav o .flac para continuar.`
    );
  }

  if (files.length > 1) {
    throw new Error(
      `Se detectaron múltiples archivos de audio. Especifique el archivo principal o mantenga solo uno en 'sources/audio/'. Archivos encontrados: [${files.join(", ")}].`
    );
  }

  const fullPath = path.join(audioDir, files[0]);
  const relativePath = path.relative(projectDir, fullPath).replace(/\\/g, "/");

  return { fullPath, relativePath };
}

/**
 * Orquesta el análisis espectral completo de un archivo de audio y genera la estructura AudioAnalysisData.
 */
export function analyzeAudio(
  audioFilePath: string,
  projectDir: string,
  fps = 30
): AudioAnalysisData {
  const relativePath = path.relative(projectDir, audioFilePath).replace(/\\/g, "/");
  const pcmBuffer = decodeAudioFileToPcm(audioFilePath, relativePath);
  const frames = analyzePcmBuffer(pcmBuffer, 44100, fps);

  const durationInSeconds = Number((frames.length / fps).toFixed(2));
  const fileHash = crypto.createHash("sha256").update(fs.readFileSync(audioFilePath)).digest("hex");

  const meta: MetaHeader = {
    generator: "webmov",
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    sourceFile: relativePath,
    sourceHash: fileHash,
    durationInSeconds,
    frameCount: frames.length,
    fps,
  };

  return {
    _meta: meta,
    frames,
  };
}

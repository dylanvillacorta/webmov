import fs from "fs";

/**
 * Genera un archivo WAV PCM determinista de 16-bit mono para testing sin dependencias externas.
 */
export function generateTestWav(options: {
  filePath: string;
  durationSeconds: number;
  sampleRate?: number;
  frequencyHz?: number;
}): void {
  const sampleRate = options.sampleRate || 44100;
  const numSamples = Math.floor(sampleRate * options.durationSeconds);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // Cabecera RIFF / WAV
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // Formato PCM
  buffer.writeUInt16LE(1, 22); // Mono (1 canal)
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
  buffer.writeUInt16LE(2, 32); // Block align
  buffer.writeUInt16LE(16, 34); // Bits por muestra
  buffer.write("data", 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Generación de onda senoidal pura o silencio
  const freq = options.frequencyHz || 0;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = freq > 0 ? Math.sin(2 * Math.PI * freq * t) * 32767 : 0;
    buffer.writeInt16LE(Math.floor(sample), 44 + i * 2);
  }

  fs.writeFileSync(options.filePath, buffer);
}

import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { LyricLine, LyricWord, LyricsTrackData, MetaHeader } from "../../src/types/index.js";

/**
 * Convierte una marca de tiempo en formato [mm:ss.xx] o <mm:ss.xx> a milisegundos.
 */
export function timestampToMs(raw: string, filename: string, lineNumber: number): number {
  const clean = raw.trim().replace(/^[\[<]/, "").replace(/[\]>]$/, "");
  const parts = clean.split(":");
  if (parts.length !== 2) {
    throw new Error(
      `Error de sintaxis en '${filename}', Línea ${lineNumber}: Marca de tiempo '${raw}' inválida. Formato esperado: [mm:ss.xx] (ej: [01:23.45]).`
    );
  }

  const minutes = Number(parts[0]);
  const seconds = Number(parts[1]);

  if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
    throw new Error(
      `Error de sintaxis en '${filename}', Línea ${lineNumber}: Marca de tiempo '${raw}' contiene valores numéricos fuera de rango.`
    );
  }

  return Math.round((minutes * 60 + seconds) * 1000);
}

/**
 * Parsea el contenido de un archivo LRC (estándar o Enhanced) a una estructura LyricLine[].
 */
export function parseLrcContent(content: string, filename: string): LyricLine[] {
  const rawLines = content.split(/\r?\n/);
  const parsedLines: Array<{ lineStartMs: number; textWithTags: string; lineNumber: number }> = [];

  const lineTimestampRegex = /^\[(\d{1,2}:\d{2}(?:\.\d{1,3})?)\](.*)$/;

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i].trim();
    if (!rawLine) continue;

    // Ignorar metadatos estándar ID3 de LRC (ej: [ar: Artista], [ti: Título])
    if (/^\[(ar|ti|al|by|offset|length):/i.test(rawLine)) {
      continue;
    }

    const match = rawLine.match(lineTimestampRegex);
    if (!match) {
      // Verificar si intentó colocar un timestamp malformado
      if (rawLine.startsWith("[")) {
        const brokenTag = rawLine.substring(0, rawLine.indexOf("]") + 1) || rawLine;
        throw new Error(
          `Error de sintaxis en '${filename}', Línea ${i + 1}: Marca de tiempo '${brokenTag}' inválida. Formato esperado: [mm:ss.xx] (ej: [01:23.45]).`
        );
      }
      continue;
    }

    const startMs = timestampToMs(match[1], filename, i + 1);
    const textWithTags = match[2].trim();
    if (textWithTags.length > 0) {
      parsedLines.push({
        lineStartMs: startMs,
        textWithTags,
        lineNumber: i + 1,
      });
    }
  }

  const result: LyricLine[] = [];

  for (let idx = 0; idx < parsedLines.length; idx++) {
    const current = parsedLines[idx];
    const next = parsedLines[idx + 1];

    // Estimar duración de la línea
    const defaultLineDurationMs = 3500;
    const lineEndMs = next ? Math.min(next.lineStartMs, current.lineStartMs + 5000) : current.lineStartMs + defaultLineDurationMs;

    // Detectar si contiene marcas por palabra (<mm:ss.xx> palabra)
    const wordTagsRegex = /<(\d{1,2}:\d{2}(?:\.\d{1,3})?)>\s*([^<]+)/g;
    const hasWordTags = /<\d{1,2}:\d{2}/.test(current.textWithTags);

    const words: LyricWord[] = [];
    let plainText = "";

    if (hasWordTags) {
      const matches: Array<{ tag: string; wordText: string; index: number }> = [];
      let m: RegExpExecArray | null;
      while ((m = wordTagsRegex.exec(current.textWithTags)) !== null) {
        matches.push({ tag: m[1], wordText: m[2].trim(), index: m.index });
      }

      if (matches.length > 0) {
        for (let w = 0; w < matches.length; w++) {
          const wordStartMs = timestampToMs(matches[w].tag, filename, current.lineNumber);
          let wordEndMs: number;

          if (w < matches.length - 1) {
            wordEndMs = timestampToMs(matches[w + 1].tag, filename, current.lineNumber);
          } else {
            // Última palabra: termina al final de la línea o 500ms después
            wordEndMs = Math.max(wordStartMs + 400, lineEndMs);
          }

          if (wordStartMs > wordEndMs) {
            throw new Error(
              `Error temporal en '${filename}', Línea ${current.lineNumber}: La palabra '${matches[w].wordText}' finaliza antes de comenzar (${(wordStartMs / 1000).toFixed(1)}s > ${(wordEndMs / 1000).toFixed(1)}s).`
            );
          }

          words.push({
            text: matches[w].wordText,
            startMs: wordStartMs,
            endMs: wordEndMs,
          });
        }
        plainText = words.map((w) => w.text).join(" ");
      } else {
        plainText = current.textWithTags.replace(/<[^>]+>/g, "").trim();
      }
    }

    // Si no contiene marcas por palabra o falló el regex, interpolar automáticamente
    if (words.length === 0) {
      plainText = current.textWithTags.replace(/<[^>]+>/g, "").trim();
      const rawWords = plainText.split(/\s+/).filter((w) => w.length > 0);
      if (rawWords.length > 0) {
        const totalDuration = Math.max(lineEndMs - current.lineStartMs, rawWords.length * 300);
        const perWordDuration = Math.floor(totalDuration / rawWords.length);

        for (let w = 0; w < rawWords.length; w++) {
          const wStart = current.lineStartMs + w * perWordDuration;
          const wEnd = w === rawWords.length - 1 ? current.lineStartMs + totalDuration : wStart + perWordDuration;
          words.push({
            text: rawWords[w],
            startMs: wStart,
            endMs: wEnd,
          });
        }
      }
    }

    result.push({
      id: `${path.basename(filename, path.extname(filename))}-${idx + 1}`,
      startMs: words.length > 0 ? words[0].startMs : current.lineStartMs,
      endMs: words.length > 0 ? words[words.length - 1].endMs : lineEndMs,
      text: plainText,
      words,
    });
  }

  return result;
}

/**
 * Calcula el hash SHA-256 de un archivo en disco.
 */
export function getFileSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

/**
 * Procesa un archivo de letras (LRC o JSON) y genera la estructura estandarizada LyricsTrackData.
 */
export function processLyricsFile(
  filePath: string,
  projectDir: string,
  options?: { schemaVersion?: string }
): LyricsTrackData {
  const schemaVersion = options?.schemaVersion || "1.0.0";
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath, ext);
  const trackId = baseName.toLowerCase() === "track" ? "main" : baseName;
  const relativeSource = path.relative(projectDir, filePath).replace(/\\/g, "/");
  const sourceHash = getFileSha256(filePath);

  let lines: LyricLine[] = [];

  if (ext === ".lrc") {
    const content = fs.readFileSync(filePath, "utf-8");
    lines = parseLrcContent(content, path.basename(filePath));
  } else if (ext === ".json") {
    try {
      const rawJson = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) {
        lines = parsed;
      } else if (parsed && Array.isArray(parsed.lines)) {
        lines = parsed.lines;
      } else {
        throw new Error(
          `Estructura inválida en '${relativeSource}'. Se esperaba un array de líneas o un objeto con la propiedad 'lines'.`
        );
      }
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        throw new Error(
          `Error de sintaxis JSON en '${relativeSource}': ${err.message}. Verifique comas y formato.`
        );
      }
      throw err;
    }
  } else {
    throw new Error(`Extensión '${ext}' no soportada para letras. Utilice .lrc o .json.`);
  }

  const meta: MetaHeader = {
    generator: "webmov",
    schemaVersion,
    generatedAt: new Date().toISOString(),
    trackId,
    sourceFile: relativeSource,
    sourceHash,
  };

  return {
    _meta: meta,
    lines,
  };
}

import { z } from "zod";
import type { ProjectConfig } from "../types/index.js";

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$/;

export const TrackConfigSchema = z.object({
  trackId: z.string({
    required_error: "Cada pista de subtítulos debe tener un 'trackId' definido.",
  }),
  position: z
    .object({
      y: z.string().default("60%"),
    })
    .default({ y: "60%" }),
  fontSize: z.number().positive("El 'fontSize' debe ser un número positivo.").default(48),
  primaryColor: z
    .string()
    .regex(hexColorRegex, "El 'primaryColor' debe ser un código HEX válido (ej: #FFE600).")
    .default("#FFE600"),
  secondaryColor: z
    .string()
    .regex(hexColorRegex, "El 'secondaryColor' debe ser un código HEX válido (ej: #FF0055).")
    .optional(),
  opacity: z.number().min(0).max(1, "El valor de 'opacity' debe estar entre 0 y 1.").default(1),
  activeScale: z
    .number()
    .min(1, "El valor de 'activeScale' debe ser mayor o igual a 1.")
    .default(1.15),
});

export const ProjectConfigSchema = z.object({
  title: z.string().default("WebMov Project"),
  fps: z.number().int().positive("'fps' debe ser un número positivo (ej: 30 o 60).").default(30),
  width: z.number().int().positive("'width' debe ser un número positivo (ej: 1080).").default(1080),
  height: z.number().int().positive("'height' debe ser un número positivo (ej: 1920).").default(1920),
  durationInFrames: z.number().int().positive().default(300),
  theme: z
    .object({
      primaryColor: z
        .string()
        .regex(hexColorRegex, "El 'primaryColor' debe ser un código HEX válido (ej: #FFE600).")
        .default("#FFE600"),
      secondaryColor: z
        .string()
        .regex(hexColorRegex, "El 'secondaryColor' debe ser un código HEX válido (ej: #FF0055).")
        .default("#FF0055"),
      backgroundColor: z
        .string()
        .regex(hexColorRegex, "El 'backgroundColor' debe ser un código HEX válido (ej: #0A0A0A).")
        .default("#0A0A0A"),
      fontFamily: z.string().default("Inter, Montserrat, sans-serif"),
    })
    .default({}),
  subtitles: z
    .object({
      tracks: z.array(TrackConfigSchema).default([]),
    })
    .default({ tracks: [] }),
  layers: z
    .object({
      showSubtitles: z.boolean().default(true),
      showWaveform: z.boolean().default(true),
      showParticles: z.boolean().default(true),
      enable3D: z.boolean().default(false),
    })
    .default({}),
  customProfiles: z.record(z.any()).optional(),
});

export function validateProjectConfig(rawConfig: unknown): ProjectConfig {
  const result = ProjectConfigSchema.safeParse(rawConfig || {});
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `Propiedad '${err.path.join(".")}': ${err.message}`)
      .join("\n  - ");
    throw new Error(
      `Error en config.json:\n  - ${errorDetails}\nPor favor verifique la sintaxis y los tipos de datos en su archivo config.json.`
    );
  }
  return result.data as ProjectConfig;
}

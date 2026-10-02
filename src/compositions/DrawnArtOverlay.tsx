import React from "react";
import { useCurrentFrame } from "remotion";
import type { AudioAnalysisData } from "../types";

export interface DrawnArtOverlayProps {
  analysis?: AudioAnalysisData;
  primaryColor?: string;
  secondaryColor?: string;
  title?: string;
  artist?: string;
  isLight?: boolean;
}

export const DrawnArtOverlay: React.FC<DrawnArtOverlayProps> = ({
  analysis,
  primaryColor = "#FF5E7E",
  secondaryColor = "#18181B",
  title = "MAKE YOU MINE",
  artist = "FEAT. MOA LISA",
  isLight = true,
}) => {
  const frame = useCurrentFrame();

  if (!isLight) {
    return null;
  }

  const current = analysis?.frames?.[frame] || {
    bass: 0,
    mid: 0,
    treble: 0,
    rms: 0,
    isBeat: false,
  };

  const { bass, isBeat } = current;

  // Animaciones sutiles y estrictamente deterministas
  const beatScale = isBeat ? 1.2 : 1.0;
  const floatY = Math.sin(frame * 0.06) * 6;
  const rotateLeft = Math.sin(frame * 0.04) * 8;
  const rotateRight = Math.cos(frame * 0.04) * 8;
  const heartScale = 1.0 + bass * 0.25;

  return (
    <div
      data-testid="drawn-art-overlay"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "1080px",
        height: "1920px",
        pointerEvents: "none",
        zIndex: 5,
        overflow: "hidden",
      }}
    >
      {/* 1. Marco Artístico Sketched / Dibujado a lápiz en esquinas de Safe Zone (TikTok) */}
      <svg
        width="1080"
        height="1920"
        viewBox="0 0 1080 1920"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <g stroke={secondaryColor} strokeWidth="2.5" strokeLinecap="round" opacity="0.35" fill="none">
          {/* Esquina Superior Izquierda (X: 85, Y: 220) */}
          <path d="M 85 270 Q 85 220 135 220 L 190 220" />
          <path d="M 90 260 Q 90 225 130 225 L 175 225" opacity="0.5" />

          {/* Esquina Superior Derecha (X: 915, Y: 220) - respeta margen de botones TikTok */}
          <path d="M 810 220 L 865 220 Q 915 220 915 270" />
          <path d="M 825 225 L 870 225 Q 910 225 910 260" opacity="0.5" />

          {/* Esquina Inferior Izquierda (X: 85, Y: 1520) */}
          <path d="M 85 1470 Q 85 1520 135 1520 L 190 1520" />
          <path d="M 90 1480 Q 90 1515 130 1515 L 175 1515" opacity="0.5" />

          {/* Esquina Inferior Derecha (X: 915, Y: 1520) */}
          <path d="M 810 1520 L 865 1520 Q 915 1520 915 1470" />
          <path d="M 825 1515 L 870 1515 Q 910 1515 910 1480" opacity="0.5" />
        </g>
      </svg>

      {/* 2. Cabecera Artística Minimalista (Top Safe Zone: Y = 260px) */}
      <div
        style={{
          position: "absolute",
          top: "260px",
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            padding: "6px 20px",
            borderRadius: "24px",
            border: `1.5px solid ${secondaryColor}25`,
            background: "rgba(255, 255, 255, 0.65)",
            backdropFilter: "blur(4px)",
            boxShadow: "0 2px 10px rgba(24, 24, 27, 0.04)",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: primaryColor,
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontFamily: "Inter, Montserrat, sans-serif",
              fontSize: "20px",
              fontWeight: 800,
              letterSpacing: "3px",
              color: secondaryColor,
              textTransform: "uppercase",
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontFamily: "Inter, Montserrat, sans-serif",
              fontSize: "16px",
              fontWeight: 600,
              letterSpacing: "1.5px",
              color: `${secondaryColor}88`,
              textTransform: "uppercase",
            }}
          >
            • {artist}
          </span>
        </div>

        {/* Trazo dibujado a mano sutil debajo del título */}
        <svg width="220" height="12" viewBox="0 0 220 12">
          <path
            d="M 5 6 Q 60 2 110 7 T 215 6"
            fill="none"
            stroke={primaryColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
      </div>

      {/* 3. Doodles Dibujados Flotantes (Reactivos al Ritmo y Cuadro) */}

      {/* Doodle 1: Nota Musical Dibujada (Superior Izquierda) */}
      <div
        style={{
          position: "absolute",
          top: "400px",
          left: "130px",
          transform: `translateY(${floatY}px) rotate(${rotateLeft}deg) scale(${beatScale})`,
          transition: "transform 0.08s ease-out",
        }}
      >
        <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
          <path
            d="M10 24 A 4 3 0 1 1 6 21 L 6 8 Q 6 6 12 7 L 22 5 Q 26 4 26 7 L 26 20 A 4 3 0 1 1 22 17 L 22 11 L 10 13 L 10 24"
            fill={secondaryColor}
            opacity="0.75"
          />
        </svg>
      </div>

      {/* Doodle 2: Estrella de 4 Puntas Dibujada (Superior Derecha) */}
      <div
        style={{
          position: "absolute",
          top: "420px",
          right: "180px",
          transform: `translateY(${-floatY}px) rotate(${rotateRight}deg) scale(${beatScale})`,
          transition: "transform 0.08s ease-out",
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2 Q 12 10 4 12 Q 12 12 12 22 Q 12 14 20 12 Q 12 12 12 2 Z"
            fill={primaryColor}
            opacity="0.85"
          />
        </svg>
      </div>

      {/* Doodle 3: Corazón Dibujado (Inferior Izquierda, sobre Safe Zone) */}
      <div
        style={{
          position: "absolute",
          bottom: "430px",
          left: "140px",
          transform: `scale(${heartScale}) rotate(${rotateLeft * 0.5}deg)`,
          transition: "transform 0.06s ease-out",
        }}
      >
        <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
          <path
            d="M16 28 C 16 28 4 20 4 12 C 4 7 8 4 12 4 C 14.5 4 16 6 16 6 C 16 6 17.5 4 20 4 C 24 4 28 7 28 12 C 28 20 16 28 16 28 Z"
            fill="none"
            stroke={primaryColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
          />
        </svg>
      </div>

      {/* Doodle 4: Doble Chispa / Destello Dibujado (Inferior Derecha) */}
      <div
        style={{
          position: "absolute",
          bottom: "440px",
          right: "190px",
          transform: `translateY(${floatY * 0.8}px) scale(${beatScale})`,
          transition: "transform 0.08s ease-out",
        }}
      >
        <svg width="36" height="36" viewBox="0 0 28 28" fill="none">
          <path
            d="M14 2 L 14 26 M 2 14 L 26 14 M 5 5 L 23 23 M 5 23 L 23 5"
            stroke={secondaryColor}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.35"
          />
        </svg>
      </div>
    </div>
  );
};

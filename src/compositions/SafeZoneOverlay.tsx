import React from "react";

export interface SafeZoneOverlayProps {
  showSafeZones?: boolean;
}

export const SafeZoneOverlay: React.FC<SafeZoneOverlayProps> = ({
  showSafeZones = false,
}) => {
  if (!showSafeZones) {
    return null;
  }

  return (
    <div
      data-testid="safe-zone-overlay"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "1080px",
        height: "1920px",
        pointerEvents: "none",
        zIndex: 9999,
        border: "3px dashed rgba(0, 255, 255, 0.4)",
        boxSizing: "border-box",
      }}
    >
      {/* Zona Superior (Seguidores / Para Ti / Barra de Estado) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "180px",
          backgroundColor: "rgba(255, 0, 80, 0.15)",
          borderBottom: "2px dashed rgba(255, 0, 80, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255, 255, 255, 0.8)",
          fontFamily: "sans-serif",
          fontSize: "24px",
          fontWeight: 600,
          letterSpacing: "1px",
        }}
      >
        ZONA SUPERIOR (Header / Tabs / Status)
      </div>

      {/* Zona Lateral Derecha (Botones de Interacción: Likes, Comentarios, Compartir) */}
      <div
        style={{
          position: "absolute",
          top: "600px",
          right: 0,
          width: "140px",
          height: "850px",
          backgroundColor: "rgba(255, 0, 80, 0.18)",
          borderLeft: "2px dashed rgba(255, 0, 80, 0.6)",
          borderTop: "2px dashed rgba(255, 0, 80, 0.6)",
          borderBottom: "2px dashed rgba(255, 0, 80, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255, 255, 255, 0.8)",
          fontFamily: "sans-serif",
          fontSize: "20px",
          fontWeight: 600,
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          letterSpacing: "2px",
        }}
      >
        INTERACCIÓN (Likes, Shares, Avatar)
      </div>

      {/* Zona Inferior (Nombre de Usuario, Descripción, Hashtags, Audio Tag) */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "380px",
          backgroundColor: "rgba(255, 0, 80, 0.18)",
          borderTop: "2px dashed rgba(255, 0, 80, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255, 255, 255, 0.8)",
          fontFamily: "sans-serif",
          fontSize: "24px",
          fontWeight: 600,
          letterSpacing: "1px",
        }}
      >
        ZONA INFERIOR (Usuario, Descripción, Audio Tag)
      </div>

      {/* Margen de seguridad central recomendada */}
      <div
        style={{
          position: "absolute",
          top: "220px",
          left: "60px",
          right: "160px",
          bottom: "400px",
          border: "2px solid rgba(0, 255, 128, 0.5)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          padding: "20px",
          color: "rgba(0, 255, 128, 0.8)",
          fontFamily: "sans-serif",
          fontSize: "20px",
          fontWeight: 600,
        }}
      >
        ZONA SEGURA PRINCIPAL (Contenido Crítico)
      </div>
    </div>
  );
};

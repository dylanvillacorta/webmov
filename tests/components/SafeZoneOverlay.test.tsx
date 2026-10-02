import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { SafeZoneOverlay } from "../../src/compositions/SafeZoneOverlay.js";

describe("Módulo E: Componentes Visuales - SafeZoneOverlay (VIS-07)", () => {
  it("VIS-07: Cuando showSafeZones es false, no renderiza nada (null)", () => {
    const { queryByTestId } = render(<SafeZoneOverlay showSafeZones={false} />);
    expect(queryByTestId("safe-zone-overlay")).toBeNull();
  });

  it("VIS-07: Cuando showSafeZones es true, renderiza las guías de protección", () => {
    const { getByTestId, getByText } = render(<SafeZoneOverlay showSafeZones={true} />);
    const overlay = getByTestId("safe-zone-overlay");
    expect(overlay).toBeTruthy();
    expect(getByText(/ZONA SUPERIOR/i)).toBeTruthy();
    expect(getByText(/INTERACCIÓN/i)).toBeTruthy();
    expect(getByText(/ZONA INFERIOR/i)).toBeTruthy();
    expect(getByText(/ZONA SEGURA PRINCIPAL/i)).toBeTruthy();
  });

  it("VIS-07b: Protege zonas críticas de TikTok delimitando márgenes verticales y laterales", () => {
    const { getByTestId, getByText } = render(<SafeZoneOverlay showSafeZones={true} />);
    const overlay = getByTestId("safe-zone-overlay");
    expect(overlay.style.width).toBe("1080px");
    expect(overlay.style.height).toBe("1920px");
    expect(getByText(/Likes, Shares, Avatar/i)).toBeTruthy();
    expect(getByText(/Header \/ Tabs \/ Status/i)).toBeTruthy();
    expect(getByText(/Usuario, Descripción, Audio Tag/i)).toBeTruthy();
  });
});

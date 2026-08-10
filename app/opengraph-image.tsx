import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "PathFinder — evidence-driven career readiness";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logoData = await readFile(join(process.cwd(), "public", "pathfinder-logo.png"), "base64");
const logoSrc = `data:image/png;base64,${logoData}`;

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", padding: 72, background: "#070b1a", color: "#f7f8ff", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 30, maxWidth: 880 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 34, fontWeight: 700 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="" width={76} height={76} style={{ borderRadius: 18 }} />
          PathFinder
        </div>
        <div style={{ display: "flex", fontSize: 68, lineHeight: 1.08, fontWeight: 750, letterSpacing: -2 }}>
          Turn your experience into an evidence-backed career plan.
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#b9c5e6" }}>
          Explainable job fit · verified skill evidence · adaptive roadmaps
        </div>
      </div>
    </div>,
    size,
  );
}

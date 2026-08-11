import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const logo = await readFile(
  join(process.cwd(), "public", "pathfinder-logo.png"),
  "base64",
);
const logoSource = `data:image/png;base64,${logo}`;

export default function Icon() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoSource} alt="" width={64} height={64} />
    </div>,
    size,
  );
}

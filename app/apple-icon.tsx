import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const logo = await readFile(
  join(process.cwd(), "public", "pathfinder-logo.png"),
  "base64",
);
const logoSource = `data:image/png;base64,${logo}`;

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoSource} alt="" width={180} height={180} />
    </div>,
    size,
  );
}

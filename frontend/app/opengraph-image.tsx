import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Ping My Nest: get an email the moment a seat opens in a full USM class";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share card for every page: gold and black, the logo, and the promise. */
export default async function OpengraphImage() {
  const logo = await readFile(path.join(process.cwd(), "public/images/eaglesnest-mark.png"));
  const fonts = path.join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans");
  const [bold, black] = await Promise.all([
    readFile(path.join(fonts, "Geist-Bold.ttf")),
    readFile(path.join(fonts, "Geist-Black.ttf")),
  ]);
  const src = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#ffc72c",
          color: "#0a0a0a",
          fontFamily: "Geist",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={src} width={84} height={84} alt="" />
          <span style={{ fontSize: 40, fontWeight: 900 }}>Ping My Nest</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 88, fontWeight: 900, lineHeight: 1, letterSpacing: -2 }}>Class full?</span>
          <span style={{ fontSize: 88, fontWeight: 900, lineHeight: 1, letterSpacing: -2 }}>
            Get pinged when a seat opens.
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, fontWeight: 700 }}>
          <span>Free seat alerts for Southern Miss students</span>
          <span>pingmynest.lol</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: bold, weight: 700, style: "normal" },
        { name: "Geist", data: black, weight: 900, style: "normal" },
      ],
    },
  );
}

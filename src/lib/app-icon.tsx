import { ImageResponse } from "next/og";

/**
 * The Sideline mark as a full-bleed PNG (iOS and Android round the corners
 * themselves). Drawn on a 32-unit grid to match src/app/icon.svg.
 */
export function appIconResponse(size: number) {
  const u = size / 32;
  const bar = (left: number) => ({
    position: "absolute" as const,
    left: (left - 1.2) * u,
    top: 7 * u,
    width: 2.4 * u,
    height: 18 * u,
    borderRadius: 1.2 * u,
    background: "#0a0c10",
    opacity: 0.9,
  });
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#c8f135" }}>
        <div style={bar(9)} />
        <div style={bar(16)} />
        <div style={bar(23)} />
        <div
          style={{
            position: "absolute",
            left: 6 * u,
            top: (16 - 1.2) * u,
            width: 20 * u,
            height: 2.4 * u,
            borderRadius: 1.2 * u,
            background: "#0a0c10",
          }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}

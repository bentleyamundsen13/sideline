import { ImageResponse } from "next/og";
import { logoSvg } from "./logo-svg";

/**
 * The Sideline mark as a full-bleed PNG (iOS and Android round the corners
 * themselves, so the tile is drawn square).
 */
export function appIconResponse(size: number) {
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(logoSvg({ rounded: false }))}`;
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} width={size} height={size} alt="" />
    ),
    { width: size, height: size },
  );
}

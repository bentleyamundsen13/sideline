/**
 * The Sideline mark: a tilted football on the brand-green tile, its laces in
 * the brand green. One source for the in-app logo, favicon and home-screen icons.
 * Drawn on a 32-unit grid.
 */
export const BRAND = "#c8f135";
export const INK = "#0a0c10";

// Football body: a lens pointed at both ends.
export const BALL_PATH = "M3 16 C8.2 5.4 23.8 5.4 29 16 C23.8 26.6 8.2 26.6 3 16 Z";

export function logoSvg({ rounded = true }: { rounded?: boolean } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="${rounded ? 8 : 0}" fill="${BRAND}"/>
  <g transform="rotate(-35 16 16)">
    <path d="${BALL_PATH}" fill="${INK}"/>
    <path d="M11 16 H21" stroke="${BRAND}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M12.8 13.6 V18.4 M16 13.6 V18.4 M19.2 13.6 V18.4" stroke="${BRAND}" stroke-width="1.7" stroke-linecap="round"/>
  </g>
</svg>`;
}

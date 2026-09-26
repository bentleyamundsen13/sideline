/**
 * iPhone screen sizes (portrait, in points) for iOS launch images. iOS shows the
 * matching image the instant the home-screen app is tapped, before any page
 * loads, so there's no black screen before our animated splash takes over.
 */
export const LAUNCH_SCREENS = [
  { w: 440, h: 956, dpr: 3 }, // 16/17 Pro Max
  { w: 430, h: 932, dpr: 3 }, // 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  { w: 428, h: 926, dpr: 3 }, // 12/13 Pro Max, 14 Plus
  { w: 420, h: 912, dpr: 3 }, // Air
  { w: 414, h: 896, dpr: 3 }, // XS Max, 11 Pro Max
  { w: 414, h: 896, dpr: 2 }, // XR, 11
  { w: 402, h: 874, dpr: 3 }, // 16 Pro, 17, 17 Pro
  { w: 393, h: 852, dpr: 3 }, // 14 Pro, 15, 15 Pro, 16
  { w: 390, h: 844, dpr: 3 }, // 12, 13, 14, 16e
  { w: 375, h: 812, dpr: 3 }, // X, XS, 11 Pro, 12/13 mini
  { w: 414, h: 736, dpr: 3 }, // 8 Plus
  { w: 375, h: 667, dpr: 2 }, // SE, 8
] as const;

export const launchKey = (s: { w: number; h: number; dpr: number }) => `${s.w}x${s.h}@${s.dpr}`;

export const launchStartupImages = LAUNCH_SCREENS.map((s) => ({
  url: `/launch/${launchKey(s)}`,
  media: `(device-width: ${s.w}px) and (device-height: ${s.h}px) and (-webkit-device-pixel-ratio: ${s.dpr}) and (orientation: portrait)`,
}));

import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { LAUNCH_SCREENS, launchKey } from "@/lib/launch-screens";
import { BRAND, logoSvg } from "@/lib/logo-svg";

// iOS launch images, generated once at build time. Laid out to match the
// animated splash (src/components/splash.tsx) so the hand-off is seamless.
export const dynamic = "force-static";

export function generateStaticParams() {
  return LAUNCH_SCREENS.map((s) => ({ device: launchKey(s) }));
}

/** Barlow Condensed Bold, the app's display font, for the wordmark. */
async function displayFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch("https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700&text=SIDELINE")).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function GET(_req: Request, { params }: RouteContext<"/launch/[device]">) {
  const { device } = await params;
  const screen = LAUNCH_SCREENS.find((s) => launchKey(s) === device);
  if (!screen) notFound();

  const k = screen.dpr; // everything below is in points, scaled to pixels
  const font = await displayFont();
  const logo = `data:image/svg+xml;utf8,${encodeURIComponent(logoSvg())}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0c10",
        }}
      >
        <div style={{ display: "flex", borderRadius: 22 * k, boxShadow: `0 0 ${60 * k}px -${10 * k}px ${BRAND}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={96 * k} height={96 * k} alt="" />
        </div>
        <div
          style={{
            marginTop: 24 * k,
            fontSize: 60 * k,
            lineHeight: 1,
            letterSpacing: 0.025 * 60 * k,
            color: "#eef1f6",
            fontFamily: font ? "Barlow Condensed" : undefined,
            fontWeight: 700,
          }}
        >
          SIDELINE
        </div>
        <div style={{ marginTop: 32 * k, width: 120 * k, height: 3 * k, borderRadius: 999, background: "#252b37" }} />
      </div>
    ),
    {
      width: screen.w * k,
      height: screen.h * k,
      fonts: font ? [{ name: "Barlow Condensed", data: font, weight: 700, style: "normal" }] : undefined,
    },
  );
}

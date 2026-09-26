import { appIconResponse } from "@/lib/app-icon";

// PNG icons for the web app manifest (Android home screen, splash screen).
export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }];
}

export async function GET(_req: Request, { params }: RouteContext<"/app-icons/[size]">) {
  const { size } = await params;
  return appIconResponse(size === "512" ? 512 : 192);
}

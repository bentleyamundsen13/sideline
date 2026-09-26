import { NextResponse, type NextRequest } from "next/server";
import { flushNotifications } from "@/lib/push-server";

// Called by the app right after any action that creates notifications (draft,
// trade, captain pick...). Pushes whatever hasn't gone out yet. Safe to call
// any time, by anyone: it only ever sends notifications that already exist.
export async function POST(req: NextRequest) {
  const sent = await flushNotifications(req.nextUrl.origin);
  return NextResponse.json({ sent });
}

import { ScreenCheck } from "./screen-check";

export const metadata = { title: "Screen check" };

// Diagnostic for iOS home-screen layout bugs. Open it inside the installed app.
export default function ScreenCheckPage() {
  return <ScreenCheck />;
}

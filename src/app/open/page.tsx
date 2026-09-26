import { Logo } from "@/components/ui";
import { LAST_LEAGUE_COOKIE } from "@/lib/constants";

// Where the home-screen app starts (manifest start_url). Pre-built and served
// from Vercel's cache with no server work, so the splash is on screen almost
// the instant the app opens. It then heads to your last league; iOS keeps this
// page up until that one is ready, so there's no black screen while it loads.
export const dynamic = "force-static";

const go = `(function(){
  var m = document.cookie.match(/(?:^|; )${LAST_LEAGUE_COOKIE}=([^;]+)/);
  location.replace(m ? "/l/" + encodeURIComponent(m[1]) : "/");
})();`;

export default function OpenApp() {
  return (
    <>
      <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-bg" aria-label="Loading Sideline">
        <div className="rounded-[22%] overflow-hidden shadow-[0_0_60px_-10px_var(--brand)]">
          <Logo size={96} />
        </div>
        <div className="display text-6xl tracking-wide mt-6">Sideline</div>
        <div className="splash-bar mt-8" />
      </div>
      <script dangerouslySetInnerHTML={{ __html: go }} />
    </>
  );
}

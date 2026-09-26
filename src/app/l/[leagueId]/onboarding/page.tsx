import { redirect } from "next/navigation";
import { getLeagueContext } from "@/lib/league";
import { ProfileForm } from "@/components/profile-form";
import { Wordmark } from "@/components/ui";

export const metadata = { title: "Create your profile" };

export default async function OnboardingPage({ params }: PageProps<"/l/[leagueId]/onboarding">) {
  const { leagueId } = await params;
  const { league, me, myTeam } = await getLeagueContext(leagueId);
  if (me.onboarded) redirect(`/l/${leagueId}`);

  return (
    <main className="mx-auto max-w-md px-4 pt-6 pb-16">
      <Wordmark />
      <div className="mt-8 mb-6 animate-fade-up">
        <p className="chip">{me.is_commissioner ? "Commissioner" : "New signing"}</p>
        <h1 className="display text-4xl mt-3">Welcome to {league.name}</h1>
        <p className="text-muted text-sm mt-2">
          Build your player profile. This is what captains see when they&apos;re deciding who to draft.
        </p>
      </div>
      <ProfileForm member={me} teamColor={myTeam?.color ?? null} mode="onboarding" />
    </main>
  );
}

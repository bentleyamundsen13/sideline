import { getLeagueContext } from "@/lib/league";
import { ProfileForm } from "@/components/profile-form";
import { BackHeader } from "@/components/back-header";
import { LeaveLeagueButton } from "@/components/leave-league-button";

export const metadata = { title: "Edit profile" };

export default async function EditProfilePage({ params }: PageProps<"/l/[leagueId]/me/edit">) {
  const { leagueId } = await params;
  const { me, myTeam, league } = await getLeagueContext(leagueId);

  return (
    <div className="max-w-md mx-auto animate-fade-up">
      <BackHeader href={`/l/${leagueId}/players/${me.id}`} label="My profile" />
      <h1 className="display text-4xl mt-4 mb-6">Edit profile</h1>
      <ProfileForm member={me} teamColor={myTeam?.color ?? null} mode="edit" />
      {!me.is_commissioner && (
        <div className="mt-10 pt-6 border-t border-line">
          <LeaveLeagueButton memberId={me.id} leagueName={league.name} />
        </div>
      )}
    </div>
  );
}

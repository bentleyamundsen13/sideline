"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { must, useAction } from "@/lib/use-action";
import { DEFENSE_POSITIONS, OFFENSE_POSITIONS } from "@/lib/constants";
import type { Member } from "@/lib/types";
import { Avatar } from "./ui";
import { FormError } from "./form-error";
import { errorMessage } from "@/lib/format";

/** Center-crops and shrinks a photo to a 400px square so uploads stay small. */
async function toSquareWebp(file: File, size = 400): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process that image"))), "image/webp", 0.85),
  );
}

const num = (v: string) => (v === "" ? null : Number(v));

export function ProfileForm({
  member,
  teamColor,
  mode,
}: {
  member: Member;
  teamColor: string | null;
  mode: "onboarding" | "edit";
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { run, pending, error } = useAction();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(member.avatar_url);
  const [f, setF] = useState({
    display_name: member.display_name === "New Player" ? "" : member.display_name,
    nickname: member.nickname ?? "",
    jersey_number: member.jersey_number?.toString() ?? "",
    offense_position: member.offense_position ?? "",
    defense_position: member.defense_position ?? "",
    age: member.age?.toString() ?? "",
    feet: member.height_in ? Math.floor(member.height_in / 12).toString() : "",
    inches: member.height_in ? (member.height_in % 12).toString() : "",
    weight_lb: member.weight_lb?.toString() ?? "",
    dominant_hand: member.dominant_hand ?? "",
    hometown: member.hometown ?? "",
    bio: member.bio ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const blob = await toSquareWebp(file);
      const supabase = createClient();
      const path = `${member.user_id}/${member.id}-${Date.now()}.webp`;
      const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/webp" });
      if (error) throw error;
      setAvatarUrl(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
    } catch (err) {
      setUploadError(errorMessage(err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const height = f.feet ? Number(f.feet) * 12 + Number(f.inches || 0) : null;
    const ok = await run(async () => {
      await must(
        createClient()
          .from("members")
          .update({
            display_name: f.display_name.trim(),
            nickname: f.nickname.trim() || null,
            avatar_url: avatarUrl,
            jersey_number: num(f.jersey_number),
            offense_position: f.offense_position || null,
            defense_position: f.defense_position || null,
            age: num(f.age),
            height_in: height,
            weight_lb: num(f.weight_lb),
            dominant_hand: f.dominant_hand || null,
            hometown: f.hometown.trim() || null,
            bio: f.bio.trim() || null,
            onboarded: true,
          })
          .eq("id", member.id),
      );
      return true;
    });
    if (ok) router.push(mode === "onboarding" ? `/l/${member.league_id}` : `/l/${member.league_id}/players/${member.id}`);
  }

  const preview = { display_name: f.display_name || "?", avatar_url: avatarUrl };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative rounded-full"
          aria-label="Upload profile picture"
        >
          <Avatar member={preview} color={teamColor} size="xl" />
          <span className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-text text-bg inline-flex items-center justify-center border-4 border-bg">
            <Camera size={16} />
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
        <span className="text-xs text-muted">{uploading ? "Uploading…" : avatarUrl ? "Tap to change photo" : "Add a profile picture"}</span>
        <FormError error={uploadError} />
      </div>

      <fieldset className="card p-4 space-y-4">
        <legend className="section-title px-1">Player</legend>
        <div className="grid grid-cols-[1fr_88px] gap-3">
          <div>
            <label className="label" htmlFor="display_name">Name</label>
            <input id="display_name" className="input" required maxLength={40} autoComplete="name" placeholder="Jordan Smith" value={f.display_name} onChange={set("display_name")} />
          </div>
          <div>
            <label className="label" htmlFor="jersey">Number</label>
            <input id="jersey" className="input text-center" type="number" inputMode="numeric" min={0} max={99} placeholder="12" value={f.jersey_number} onChange={set("jersey_number")} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="nickname">Nickname <Optional /></label>
          <input id="nickname" className="input" maxLength={30} placeholder="Hands" value={f.nickname} onChange={set("nickname")} />
        </div>
      </fieldset>

      <fieldset className="card p-4 space-y-4">
        <legend className="section-title px-1">Positions</legend>
        <PositionPicker label="Offense" options={OFFENSE_POSITIONS} value={f.offense_position} onChange={(v) => setF((s) => ({ ...s, offense_position: v }))} />
        <PositionPicker label="Defense" options={DEFENSE_POSITIONS} value={f.defense_position} onChange={(v) => setF((s) => ({ ...s, defense_position: v }))} />
      </fieldset>

      <fieldset className="card p-4 space-y-4">
        <legend className="section-title px-1">Measurables</legend>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="age">Age</label>
            <input id="age" className="input" type="number" inputMode="numeric" min={5} max={99} required value={f.age} onChange={set("age")} />
          </div>
          <div className="col-span-2">
            <span className="label">Height</span>
            <div className="grid grid-cols-2 gap-2">
              <select aria-label="Feet" className="input" required value={f.feet} onChange={set("feet")}>
                <option value="">ft</option>
                {[3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>{n} ft</option>
                ))}
              </select>
              <select aria-label="Inches" className="input" value={f.inches} onChange={set("inches")}>
                <option value="">in</option>
                {Array.from({ length: 12 }, (_, n) => (
                  <option key={n} value={n}>{n} in</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="weight">Weight <Optional /></label>
            <input id="weight" className="input" type="number" inputMode="numeric" min={40} max={400} placeholder="lbs" value={f.weight_lb} onChange={set("weight_lb")} />
          </div>
          <div>
            <label className="label" htmlFor="hand">Throws <Optional /></label>
            <select id="hand" className="input" value={f.dominant_hand} onChange={set("dominant_hand")}>
              <option value="">—</option>
              <option>Right</option>
              <option>Left</option>
              <option>Both</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="hometown">Hometown <Optional /></label>
          <input id="hometown" className="input" maxLength={40} value={f.hometown} onChange={set("hometown")} />
        </div>
        <div>
          <label className="label" htmlFor="bio">Bio <Optional /></label>
          <textarea id="bio" className="input min-h-20" maxLength={280} placeholder="Best hands on the block." value={f.bio} onChange={set("bio")} />
        </div>
      </fieldset>

      <FormError error={error} />
      <button
        className="btn btn-primary w-full"
        disabled={pending || uploading || !f.offense_position || !f.defense_position}
      >
        {pending ? "Saving…" : mode === "onboarding" ? "Enter the League" : "Save Profile"}
      </button>
      {(!f.offense_position || !f.defense_position) && (
        <p className="text-xs text-muted text-center -mt-3">Pick an offensive and defensive position to continue.</p>
      )}
    </form>
  );
}

function Optional() {
  return <span className="normal-case tracking-normal font-normal">(optional)</span>;
}

function PositionPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const active = value === o;
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o)}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                active ? "bg-text text-bg border-text" : "bg-bg border-line text-muted hover:text-text"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

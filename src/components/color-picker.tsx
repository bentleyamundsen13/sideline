"use client";

import { Check, Plus } from "lucide-react";
import { TEAM_COLORS } from "@/lib/constants";

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {TEAM_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-8 h-8 rounded-full inline-flex items-center justify-center transition-transform hover:scale-110"
          style={{ background: c, boxShadow: value === c ? `0 0 0 2px var(--bg), 0 0 0 4px ${c}` : undefined }}
          aria-label={`Color ${c}`}
          aria-pressed={value === c}
        >
          {value === c && <Check size={14} color="#fff" strokeWidth={3} />}
        </button>
      ))}
      <label className="w-8 h-8 rounded-full border border-dashed border-line inline-flex items-center justify-center cursor-pointer relative overflow-hidden" title="Custom color">
        <Plus size={14} className="text-muted" />
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
      </label>
    </div>
  );
}

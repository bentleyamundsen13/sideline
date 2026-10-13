"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, RotateCcw, Sparkles, X } from "lucide-react";
import { QUIZ, percentile, scoreQuiz } from "@/lib/position-quiz";
import { formatHeight } from "@/lib/format";

export type BodySize = { height_in: number | null; weight_lb: number | null };

/** "What position is best for me?" button that opens the quiz. */
export function PositionQuizButton(props: Omit<QuizProps, "onClose">) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full card p-4 flex items-center gap-3 text-left hover:bg-surface-2 transition-colors"
      >
        <span className="w-10 h-10 shrink-0 rounded-full bg-brand text-bg inline-flex items-center justify-center">
          <Sparkles size={18} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-sm">What position is best for me?</span>
          <span className="block text-xs text-muted">Take a 6-question quiz and see how your size compares with the league</span>
        </span>
      </button>
      {open && <PositionQuiz {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

type QuizProps = {
  me: BodySize;
  /** Everyone else in the league, for the size comparison. */
  others: BodySize[];
  onPick: (offense: string, defense: string) => void;
  onClose: () => void;
};

function PositionQuiz({ me, others, onPick, onClose }: QuizProps) {
  const [answers, setAnswers] = useState<number[]>([]);
  const step = answers.length; // 0..QUIZ.length; QUIZ.length = result
  const size = {
    height: percentile(me.height_in, others.map((o) => o.height_in)),
    weight: percentile(me.weight_lb, others.map((o) => o.weight_lb)),
  };
  const result = step >= QUIZ.length ? scoreQuiz(answers, size) : null;
  const question = QUIZ[step];

  return createPortal(
    <div className="fixed inset-0 z-[90] bg-black/70 flex items-end sm:items-center justify-center animate-fade-up" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Position quiz"
        className="w-full sm:max-w-md max-h-[92dvh] flex flex-col bg-bg border border-line rounded-t-3xl sm:rounded-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
          {step > 0 && !result ? (
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-surface-2 inline-flex items-center justify-center"
              onClick={() => setAnswers((a) => a.slice(0, -1))}
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
          ) : null}
          <div className="flex-1 min-w-0">
            <div className="display text-lg">Find your position</div>
            {!result && (
              <div className="text-xs text-muted tabular">
                Question {step + 1} of {QUIZ.length}
              </div>
            )}
          </div>
          <button type="button" className="w-9 h-9 rounded-full bg-surface-2 inline-flex items-center justify-center" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {!result && (
          <div className="h-1 bg-surface-2">
            <div className="h-full bg-brand transition-all" style={{ width: `${(step / QUIZ.length) * 100}%` }} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {question && (
            <>
              <h2 className="text-lg font-semibold">{question.q}</h2>
              <div className="space-y-2">
                {question.options.map((o, i) => (
                  <button
                    key={o.label}
                    type="button"
                    className="w-full card px-4 py-3.5 text-left text-sm font-semibold hover:bg-surface-2 active:scale-[0.99] transition"
                    onClick={() => setAnswers((a) => [...a, i])}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {result && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <ResultCard side="Offense" position={result.offense} why={result.offenseWhy} />
                <ResultCard side="Defense" position={result.defense} why={result.defenseWhy} />
              </div>
              <SizeCompare me={me} size={size} count={others.length} />
              <div className="flex gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setAnswers([])}>
                  <RotateCcw size={15} /> Retake
                </button>
                <button
                  type="button"
                  className="btn btn-primary flex-1"
                  onClick={() => {
                    onPick(result.offense, result.defense);
                    onClose();
                  }}
                >
                  <Check size={16} /> Use these positions
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ResultCard({ side, position, why }: { side: string; position: string; why: string }) {
  return (
    <div className="card p-3.5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted">{side}</div>
      <div className="display text-3xl mt-1">{position}</div>
      <p className="text-xs text-muted mt-1.5">{why}</p>
    </div>
  );
}

/** How your height and weight stack up against everyone else in the league. */
function SizeCompare({ me, size, count }: { me: BodySize; size: { height: number | null; weight: number | null }; count: number }) {
  const rows = [
    { label: "Height", value: me.height_in ? formatHeight(me.height_in) : null, pct: size.height, bigger: "Taller" },
    { label: "Weight", value: me.weight_lb ? `${me.weight_lb} lb` : null, pct: size.weight, bigger: "Heavier" },
  ];
  return (
    <div className="card p-4 space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted">Your size vs the league</div>
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold">
              {r.label} <span className="text-muted font-normal">{r.value ?? ""}</span>
            </span>
            <span className="text-xs text-muted text-right">
              {!r.value
                ? `Add your ${r.label.toLowerCase()} to compare`
                : r.pct == null
                  ? "Not enough players to compare yet"
                  : `${r.bigger} than ${Math.round(r.pct * 100)}% of the league`}
            </span>
          </div>
          {r.pct != null && (
            <div className="relative h-2 rounded-full bg-surface-2 mt-2">
              <div className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${Math.max(4, r.pct * 100)}%` }} />
            </div>
          )}
        </div>
      ))}
      {count > 0 && <p className="text-[11px] text-muted">Compared with {count} other player{count === 1 ? "" : "s"} who entered theirs.</p>}
    </div>
  );
}

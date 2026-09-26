export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-2/3 rounded-lg bg-surface-2" />
      <div className="h-32 rounded-2xl bg-surface" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-20 rounded-2xl bg-surface" />
        <div className="h-20 rounded-2xl bg-surface" />
        <div className="h-20 rounded-2xl bg-surface" />
      </div>
      <div className="h-64 rounded-2xl bg-surface" />
    </div>
  );
}

export function FormError({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="text-sm rounded-lg px-3 py-2 border"
      style={{
        color: "#fda4af",
        background: "color-mix(in srgb, var(--danger) 10%, transparent)",
        borderColor: "color-mix(in srgb, var(--danger) 30%, transparent)",
      }}
    >
      {error}
    </p>
  );
}

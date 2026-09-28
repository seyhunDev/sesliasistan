export function Field({ label, ...p }) {
  return (
    <label className="block text-xs font-semibold text-mut">
      {label}
      <input
        {...p}
        className="mt-1.5 h-12 w-full rounded-xl border border-line bg-card px-3 text-base text-fg outline-none transition focus:border-acc focus:ring-4 focus:ring-acc/15"
      />
    </label>
  );
}

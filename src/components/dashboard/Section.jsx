import Link from "next/link";

export function Section({ title, href, children }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[1.0625rem] font-semibold">{title}</h2>
        {href && (
          <Link href={href} className="text-sm font-medium text-acc transition active:opacity-50">
            Tümü
          </Link>
        )}
      </div>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">{children}</div>
    </section>
  );
}

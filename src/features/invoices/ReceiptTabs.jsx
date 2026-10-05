import Link from "next/link";

// Fişler | Faturalar sekmesi (yalnız ana hesap; faturalar ayrı kayıt, aynı yerde durur)
export function ReceiptTabs({ value }) {
  const tab = (k, href, label) => (
    <Link
      href={href}
      replace
      aria-current={value === k ? "page" : undefined}
      className={`flex-1 rounded-full py-1.5 text-center text-[0.8125rem] font-semibold transition ${value === k ? "bg-card text-fg shadow-[0_1px_3px_rgba(38,40,44,.1)]" : "text-mut"}`}
    >
      {label}
    </Link>
  );
  return (
    <div className="mt-1 flex rounded-full bg-line/60 p-1">
      {tab("receipts", "/receipts", "Fişler")}
      {tab("invoices", "/invoices", "Faturalar")}
    </div>
  );
}

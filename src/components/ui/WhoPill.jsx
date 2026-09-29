import { Icon } from "./Icon";

// Görevli etiketi: baş harf + ad; birden fazla kişide "Sanver +1".
// Görevli yoksa (names boş) iş ana hesaptadır: soluk "Ana hesap" etiketi.
// status: sorumluların durumu ("sent" | "delivered" | "read" | "done" | "pending"); ana hesapta tik olarak görünür (done = yeşil)
export function WhoPill({ names = [], className = "", status }) {
  const owner = !names.length;
  const first = owner ? "Ana hesap" : names[0].split(" ")[0];
  return (
    <span
      title={owner ? "Görevli yok · ana hesapta" : names.join(", ")}
      className={`inline-flex ${owner ? "" : "max-w-[42%]"} shrink-0 items-center gap-1 self-center rounded-full py-0.5 pl-0.5 pr-2 text-[12px] font-medium ${owner ? "bg-line/70 text-mut" : "bg-acc/10 text-acc"} ${className}`}
    >
      <span className={`grid size-[18px] shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white ${owner ? "bg-mut/70" : "bg-acc"}`}>{first[0]}</span>
      <span className="truncate">{first}</span>
      {names.length > 1 && <span className="shrink-0">+{names.length - 1}</span>}
      {status && status !== "pending" && (
        <Icon
          name={status === "sent" ? "check" : status === "done" ? "check" : "checks"}
          className={`size-3.5 shrink-0 [stroke-width:2.5] ${status === "done" ? "text-ok" : status === "read" ? "text-sky-600" : "text-mut"}`}
          aria-label={status === "done" ? "Tamamladı" : status === "read" ? "Görüldü" : status === "delivered" ? "İletildi" : "Gönderildi"}
        />
      )}
    </span>
  );
}

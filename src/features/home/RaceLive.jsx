"use client";

import Link from "next/link";
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { Row, RowList } from "@/components/ui/Row";
import { Sheet } from "@/components/ui/Sheet";
import { useAuth } from "@/features/auth/AuthProvider";
import { db } from "@/lib/firebase/clientApp";
import { liveRace } from "@/lib/homeTiles";
import { todayStr } from "@/lib/utils/format";

// Süren yarışın Multimedya kısayolu (Seyhun 2026-10-26, örnek "B · İnce şerit"): yarışın ilk gününden son gününe kadar ana sayfada günlerin altında
// tek satır: canlı nokta + "YARIŞ SÜRÜYOR", yarış adı, sağda Multimedya (yarışın /media sayfası) ve ⋯. ⋯: "Bu yarışta gösterme" (bu cihazda
// o yarış gizlenir, sonraki yarışta yine çıkar) ve "Hiç gösterme" (users.raceLive "off"; Ayarlar › Ana sayfada yarış kısayolu ile geri açılır).
const HIDE = "sa-race-live-hide";
const hidden = () => {
  try {
    return localStorage.getItem(HIDE) || "";
  } catch {
    return "";
  }
};

export function RaceLive({ open }) {
  const { profile } = useAuth();
  const [gone, setGone] = useState(hidden);
  const [menu, setMenu] = useState(false);
  const r = profile?.raceLive === "off" ? null : liveRace(open, todayStr());
  if (!r || gone === r.id) return null;
  const hideThis = () => {
    try {
      localStorage.setItem(HIDE, r.id);
    } catch {}
    setMenu(false);
    setGone(r.id);
  };
  const hideAll = () => {
    setMenu(false);
    setGone(r.id);
    if (profile?.uid) updateDoc(doc(db, "users", profile.uid), { raceLive: "off" }).catch(() => {});
  };
  return (
    <div className="mt-3 flex items-center gap-2.5 rounded-[1.125rem] border border-[rgba(103,232,249,.45)] bg-white/[.07] py-2.5 pl-3.5 pr-2.5">
      <Link href={`/athletes/races/${r.id}`} className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[0.75rem] font-bold tracking-[.04em]">
          <span className="size-2 shrink-0 rounded-full bg-[#f05a5a] shadow-[0_0_0_4px_rgba(240,90,90,.25)]" />
          YARIŞ SÜRÜYOR
        </span>
        <b className="block truncate text-[0.9375rem] font-semibold">{r.title}</b>
      </Link>
      <Link href={`/athletes/races/${r.id}/media`} data-press className="grid h-[2.375rem] shrink-0 place-items-center rounded-xl bg-[#0ea5c4] px-3.5 text-[0.875rem] font-bold text-white">
        Multimedya
      </Link>
      <button type="button" data-press aria-label="Yarış kısayolu seçenekleri" onClick={() => setMenu(true)} className="grid size-[2.125rem] shrink-0 place-items-center rounded-full bg-white/12 text-white">
        <Icon name="more" className="size-5" />
      </button>
      <Sheet open={menu} onClose={() => setMenu(false)} title="Yarış kısayolu" navy>
        <RowList>
          <Row title="Bu yarışta gösterme" sub="Sonraki yarışta yine çıkar" onClick={hideThis} chev={false} />
          <Row title="Hiç gösterme" sub="Ayarlar'dan yeniden açılır" onClick={hideAll} chev={false} />
        </RowList>
      </Sheet>
    </div>
  );
}

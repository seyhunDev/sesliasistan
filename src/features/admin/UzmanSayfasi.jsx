"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { BackButton } from "@/components/ui/BackButton";
import { ListHead } from "@/components/ui/Row";
import { LoadFail } from "@/components/ui/LoadFail";
import { ListLoading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { liveHead } from "@/features/liveScreen/fonts";
import { loadPrograms } from "@/features/fitness/fitnessData";
import { DURUM, PAYLAS_AD, bransAd, doluluk, paylasilanPlanlar, sporAd } from "@/lib/uzman";
import { todayStr } from "@/lib/utils/format";

// Uzmanın sayfası (Seyhun 2026-11-27): uzmana atanan sporcular, her birinin gönderdiği bilgiler (hedef, süre, ders programı,
// paylaştığı planlar) ve o sporcu için hazırlanan fitness programları. "Program hazırla" Fitness'taki ortak program ekleme
// penceresini o sporcu seçili açar (kendim hazırla, hazır program, yapay zeka, PDF). Şimdilik ana hesap görür; ileride uzman
// kendi girişiyle aynı sayfayı görecek (uzmanlar.uid, istek.uzmanUid; kurallar hazır).

const gunYaz = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" });
const Av = ({ ad }) => (
  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#26262b] text-[0.8125rem] font-bold text-fg2">
    {String(ad || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toLocaleUpperCase("tr")}
  </span>
);
const Bilgi = ({ ad, children }) => (
  <div className="flex min-h-[2.5rem] items-center justify-between gap-3 text-[0.9375rem]">
    <span className="shrink-0 text-mut">{ad}</span>
    <span className="min-w-0 truncate text-right">{children || "–"}</span>
  </div>
);
const Baslik = ({ children }) => <p className="pt-2 text-[0.6875rem] font-semibold tracking-[0.06em] text-mut">{children}</p>;
const dugme = (main) =>
  `rounded-xl px-3.5 py-2 text-[0.8125rem] font-bold transition active:translate-y-[2px] ${main ? "bg-acc text-[#111] shadow-[0_3px_0_#8ea620]" : "bg-[#1f1f22] text-fg shadow-[0_3px_0_#000]"}`;

export function UzmanSayfasi({ id }) {
  const { profile } = useAuth();
  const org = profile?.orgId;
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState(false);
  const yukle = useCallback(async () => {
    try {
      const [u, i, p] = await Promise.all([
        getDoc(doc(db, "orgs", org, "uzmanlar", id)),
        getDocs(query(collection(db, "orgs", org, "uzmanIstekleri"), where("uzmanId", "==", id))),
        loadPrograms(org, { force: true }).catch(() => []),
      ]);
      setHata(false);
      setVeri({ uzman: u.exists() ? { id: u.id, ...u.data() } : null, istekler: i.docs.map((d) => ({ id: d.id, ...d.data() })), programlar: p });
    } catch (e) {
      console.warn("[uzman]", e?.code || e?.message);
      setHata(true);
    }
  }, [org, id]);
  useEffect(() => {
    if (org) Promise.resolve().then(yukle);
  }, [org, yukle]);

  if (profile?.role !== "owner") return null;
  const u = veri?.uzman;
  const ist = veri?.istekler || [];
  const yeni = ist.filter((i) => i.durum === "atandi");
  const suren = ist.filter((i) => i.durum === "kabul");
  const biten = ist.filter((i) => i.durum === "bitti");
  const guncelle = (iid, f) => setVeri((v) => ({ ...v, istekler: v.istekler.map((x) => (x.id === iid ? { ...x, ...f } : x)) }));
  return (
    <main className={`sahne-pg ${liveHead.variable} wide mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]`}>
      <section className="pb-5 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <header className="flex items-center gap-2.5">
          <BackButton href="/settings/admin?sekme=uzman" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="sahne-t truncate text-[2rem]">{u?.ad || "Uzman"}</h1>
            <p className="mt-1 truncate text-[0.8125rem] text-mut">{u ? ["Uzman sayfası", bransAd(u.brans), u.ornek && "örnek"].filter(Boolean).join(" · ") : " "}</p>
          </div>
        </header>
      </section>
      {hata ? (
        <LoadFail onRetry={yukle} />
      ) : !veri ? (
        <ListLoading height="20rem" />
      ) : !u ? (
        <p className="rounded-[1.25rem] border border-line bg-card px-4 py-6 text-center text-mut">Bu uzman bulunamadı.</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Yeni gelen", yeni.length, true],
              ["Sporcusu", suren.length],
              ["Boş yer", u.kapasite ? Math.max(0, u.kapasite - doluluk(u.id, ist)) : "–"],
            ].map(([k, n, acc]) => (
              <div key={k} className="min-w-0 rounded-2xl border border-line bg-card px-3 py-2.5">
                <p className="truncate text-[0.75rem] text-mut">{k}</p>
                <p className={`sahne-t mt-1 text-[2rem] tabular-nums ${acc && n ? "text-acc" : ""}`}>{n}</p>
              </div>
            ))}
          </div>
          {!ist.length && <p className="rounded-[1.25rem] border border-line bg-card px-4 py-6 text-center text-[0.9375rem] text-mut">Henüz bu uzmana atanmış sporcu yok.</p>}
          {[
            ["Yeni gelenler", yeni],
            ["Sporcuları", suren],
            ["Bitenler", biten],
          ].map(([t, list]) =>
            list.length ? (
              <section key={t}>
                <ListHead title={t} count={list.length} />
                <div className="space-y-2">
                  {list.map((i) => (
                    <SporcuKart key={i.id} org={org} i={i} programlar={veri.programlar} acik={list.length === 1 || i.durum === "atandi"} guncelle={guncelle} />
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </div>
      )}
    </main>
  );
}

function SporcuKart({ org, i, programlar, acik: ilk, guncelle }) {
  const [acik, setAcik] = useState(ilk);
  const { plans } = useData();
  const toast = useToast();
  const bugun = todayStr();
  const paylasilan = useMemo(() => paylasilanPlanlar(plans, i.sporcuUid, i.paylas, bugun), [plans, i.sporcuUid, i.paylas, bugun]);
  const progs = (programlar || []).filter((p) => i.sporcuUid && p.for === i.sporcuUid);
  const yaz = async (f, msg) => {
    guncelle(i.id, f);
    try {
      await updateDoc(doc(db, "orgs", org, "uzmanIstekleri", i.id), { ...f, guncel: serverTimestamp() });
      msg && toast?.(msg);
    } catch {
      toast?.("Kaydedilemedi");
    }
  };
  const ders = async () => {
    try {
      const res = await authFetch(`/api/uzman-istek?orgId=${encodeURIComponent(org)}&ders=${encodeURIComponent(i.id)}`);
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60e3);
    } catch {
      toast?.("Ders programı açılamadı");
    }
  };
  return (
    <div className={`overflow-hidden rounded-[1.25rem] border bg-card ${i.durum === "atandi" ? "border-acc" : "border-line"}`}>
      <button type="button" onClick={() => setAcik(!acik)} aria-expanded={acik} className="flex min-h-[3.5rem] w-full items-center gap-2.5 px-4 py-2 text-left transition active:bg-bg">
        <Av ad={i.sporcuAd} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{i.sporcuAd || "Sporcu"}</span>
          <span className="block truncate text-[0.8125rem] text-mut">{[i.sure && `${i.sure} ay`, i.hedef, i.yas && `${i.yas} yaş`].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="shrink-0 text-[0.75rem] font-bold text-mut">{i.durum === "atandi" ? <span className="rounded-full bg-acc px-2 py-0.5 text-[#111]">Yeni</span> : DURUM[i.durum]}</span>
      </button>
      {acik && (
        <div className="space-y-1 border-t border-dashed border-line px-4 pb-4 pt-2">
          <Bilgi ad="Hedef">{i.hedef}</Bilgi>
          <Bilgi ad="Süre">{i.sure ? `${i.sure} ay` : ""}</Bilgi>
          <Bilgi ad="Spor">{i.spor ? sporAd(i.spor === "sailing" ? "yelken" : i.spor) : ""}</Bilgi>
          {i.ders ? (
            <button type="button" onClick={ders} className="block w-full text-left">
              <Bilgi ad="Ders programı">
                <span className="text-acc">{i.ders.ad || i.ders.name || "Dosya"} ›</span>
              </Bilgi>
            </button>
          ) : (
            <Bilgi ad="Ders programı">Yok</Bilgi>
          )}
          <Baslik>PAYLAŞTIĞI PLANLAR · 3 HAFTA</Baslik>
          {!i.paylas?.acik ? (
            <p className="text-[0.875rem] text-mut">Planlarını paylaşmadı.</p>
          ) : (
            <>
              <p className="text-[0.8125rem] text-mut">{(i.paylas.turler || []).map((t) => PAYLAS_AD[t] || t).join(", ")}</p>
              {paylasilan.length ? (
                <div className="space-y-1 pt-1 text-[0.875rem]">
                  {paylasilan.slice(0, 12).map((p) => (
                    <div key={p.id} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">{p.title || "Plan"}</span>
                      <span className="shrink-0 tabular-nums text-mut">
                        {gunYaz(p.date)}
                        {p.time ? ` ${p.time}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[0.875rem] text-mut">Önümüzdeki 3 haftada plan yok.</p>
              )}
            </>
          )}
          <Baslik>PROGRAMLARI</Baslik>
          {progs.length ? (
            <div className="space-y-1 text-[0.875rem]">
              {progs.map((p) => (
                <div key={p.id} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">{p.title}</span>
                  <span className="shrink-0 text-mut">
                    {p.weeks} hafta{p.active ? " · etkin" : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[0.875rem] text-mut">Henüz program yok.</p>
          )}
          <div className="flex flex-wrap gap-2 pt-3">
            {i.sporcuUid ? (
              <Link href={`/fitness?hazirla=${encodeURIComponent(i.sporcuUid)}`} className={dugme(true)}>
                Program hazırla
              </Link>
            ) : (
              <span className={`${dugme(true)} opacity-40`}>Program hazırla</span>
            )}
            {i.durum === "atandi" && (
              <button type="button" onClick={() => yaz({ durum: "kabul" }, "Sporcu kabul edildi")} className={dugme(false)}>
                Kabul et
              </button>
            )}
            {i.durum === "kabul" && (
              <button type="button" onClick={() => yaz({ durum: "bitti" }, "Bitti olarak işaretlendi")} className={dugme(false)}>
                Bitti
              </button>
            )}
            {i.durum === "bitti" && (
              <button type="button" onClick={() => yaz({ durum: "kabul" })} className={dugme(false)}>
                Yeniden başlat
              </button>
            )}
          </div>
          {!i.sporcuUid && <p className="pt-1 text-[0.75rem] text-mut">Örnek sporcuya program hazırlanamaz.</p>}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { BackButton } from "@/components/ui/BackButton";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { liveHead } from "@/features/liveScreen/fonts";
import { VELORA_ADMIN } from "@/lib/sharedRace";
import { BAGLANTILAR, CIHAZ, CIHAZ_SAYI, KALANLAR, OTO, OTO_SAYI, OTO_TARIH, cihazId, disLink, tamAdres } from "@/lib/acilis";

// Admin › Açılış (yalnız Velora ana hesabı; Seyhun 2026-11-27 "açılış masası… ben adminden yöneteceğim"): herkese açmadan önce
// kalan işler, cihaz testleri (işaretli), otomatik test özeti ve bağlantılar. İçerik lib/acilis.js; işaretler orgs/{org}/ayar/acilis
// (her cihazda aynı). Gruplar dokununca açılır.

const Liste = ({ children }) => <div className="divide-y divide-line overflow-hidden rounded-[1.25rem] border border-line bg-card">{children}</div>;
const Baslik = ({ children, sag }) => (
  <div className="flex items-baseline justify-between gap-3 px-1 pb-2 pt-6">
    <h2 className="text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-mut">{children}</h2>
    {sag && <span className="text-[0.8125rem] tabular-nums text-mut">{sag}</span>}
  </div>
);

function Kutu({ id, ad, alt, on, onToggle }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} onClick={() => onToggle(id)} className="flex w-full items-start gap-3 px-4 py-3 text-left transition active:bg-bg">
      <span className={`mt-0.5 grid size-[1.375rem] shrink-0 place-items-center rounded-[0.4rem] border-2 ${on ? "border-acc bg-acc text-[#111]" : "border-mut"}`} aria-hidden="true">
        {on && <b className="text-[0.8125rem] leading-none">✓</b>}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[0.9375rem] ${on ? "text-mut line-through" : ""}`}>{ad}</span>
        {alt && <span className="mt-0.5 block text-[0.8125rem] text-mut">{alt}</span>}
      </span>
    </button>
  );
}

function Grup({ ad, sag, acik, onAc, children }) {
  return (
    <div>
      <button type="button" aria-expanded={acik} onClick={onAc} className="flex min-h-[3rem] w-full items-center gap-3 px-4 text-left transition active:bg-bg">
        <span className="min-w-0 flex-1 truncate text-[1rem] font-medium">{ad}</span>
        <span className="text-[0.875rem] tabular-nums text-mut">{sag}</span>
        <span className={`text-mut transition ${acik ? "rotate-90" : ""}`} aria-hidden="true">›</span>
      </button>
      {acik && <div className="divide-y divide-line border-t border-line bg-bg/40">{children}</div>}
    </div>
  );
}

export function AcilisSayfasi() {
  const { profile, user } = useAuth();
  const email = String(user?.email || profile?.email || "").toLowerCase();
  if (profile?.role !== "owner" || email !== VELORA_ADMIN || !profile?.orgId) return null;
  return <Acilis org={profile.orgId} />;
}

function Acilis({ org }) {
  const toast = useToast();
  const [is, setIs] = useState(null); // { id: true }
  const [acik, setAcik] = useState("");
  const ref = doc(db, "orgs", org, "ayar", "acilis");

  useEffect(() => {
    getDoc(doc(db, "orgs", org, "ayar", "acilis"))
      .then((s) => setIs(s.data()?.isaret || {}))
      .catch(() => setIs({}));
  }, [org]);

  const degis = (id) => {
    const yeni = { ...is, [id]: !is?.[id] };
    if (!yeni[id]) delete yeni[id];
    setIs(yeni);
    setDoc(ref, { isaret: yeni, at: Date.now() }).catch(() => toast?.("Kaydedilemedi"));
  };

  const say = (pre) => Object.keys(is || {}).filter((k) => k.startsWith(pre)).length;
  const kalan = KALANLAR.length - say("k-");
  const cihazBitti = say("c-");
  const ac = (k) => setAcik((a) => (a === k ? "" : k));

  return (
    <main className={`sahne-pg ${liveHead.variable} wide mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]`}>
      <section className="pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <header className="flex items-center gap-2.5">
          <BackButton href="/settings/admin" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="sahne-t truncate text-[2rem]">Açılış</h1>
            <p className="mt-1 truncate text-[0.8125rem] text-mut">Herkese açmadan önce</p>
          </div>
        </header>
      </section>

      <div className="grid grid-cols-3 gap-2">
        {[
          ["Kalan iş", is ? kalan : "–", kalan > 0],
          ["Cihaz testi", is ? `${cihazBitti}/${CIHAZ_SAYI}` : "–"],
          ["Otomatik", `${OTO_SAYI}/${OTO_SAYI}`],
        ].map(([ad, n, acc]) => (
          <div key={ad} className="min-w-0 rounded-2xl border border-line bg-card px-3 py-2.5">
            <p className="truncate text-[0.75rem] text-mut">{ad}</p>
            <p className={`sahne-t mt-1 truncate text-[1.75rem] tabular-nums ${acc ? "text-acc" : ""}`}>{n}</p>
          </div>
        ))}
      </div>

      <Baslik sag={is ? `${KALANLAR.length - kalan} / ${KALANLAR.length}` : ""}>Açılıştan önce</Baslik>
      <Liste>
        {KALANLAR.map((k) => (
          <Kutu key={k.id} id={`k-${k.id}`} ad={k.ad} alt={k.alt} on={!!is?.[`k-${k.id}`]} onToggle={degis} />
        ))}
      </Liste>

      <Baslik sag={is ? `${cihazBitti} / ${CIHAZ_SAYI}` : ""}>Cihaz testleri</Baslik>
      <Liste>
        {CIHAZ.map((g) => {
          const n = g.m.filter((_, i) => is?.[`c-${cihazId(g.id, i)}`]).length;
          return (
            <Grup key={g.id} ad={g.ad} sag={`${n} / ${g.m.length}`} acik={acik === g.id} onAc={() => ac(g.id)}>
              {g.m.map((t, i) => {
                const id = `c-${cihazId(g.id, i)}`;
                return <Kutu key={id} id={id} ad={t} on={!!is?.[id]} onToggle={degis} />;
              })}
            </Grup>
          );
        })}
      </Liste>

      <Baslik sag={OTO_TARIH}>Otomatik testler</Baslik>
      <Liste>
        {OTO.map((g, gi) => (
          <Grup key={g.ad} ad={g.ad} sag={`✓ ${g.m.length}`} acik={acik === `o${gi}`} onAc={() => ac(`o${gi}`)}>
            {g.m.map((t) => (
              <p key={t} className="flex gap-3 px-4 py-2.5 text-[0.875rem]">
                <span className="text-acc" aria-hidden="true">✓</span>
                <span className="min-w-0 flex-1">{t}</span>
              </p>
            ))}
          </Grup>
        ))}
      </Liste>

      <Baslik>Bağlantılar</Baslik>
      <Liste>
        {BAGLANTILAR.map(([ad, u, alt]) => {
          const ic = (
            <span className="flex min-h-[3rem] items-center gap-3 px-4 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[1rem] font-medium">{ad}</span>
                {alt && <span className="block truncate text-[0.8125rem] text-mut">{alt}</span>}
              </span>
              <span className="text-mut" aria-hidden="true">{disLink(u) ? "↗" : "›"}</span>
            </span>
          );
          // Tanıtım, giriş ve kayıt: tam adresle yeni sekmede (giriş yapmamış biri gibi görmek ve adresi paylaşmak için)
          return disLink(u) || !u.startsWith("/settings") ? (
            <a key={ad} href={tamAdres(u)} target="_blank" rel="noopener noreferrer" className="block transition active:bg-bg">
              {ic}
            </a>
          ) : (
            <Link key={ad} href={u} className="block transition active:bg-bg">
              {ic}
            </Link>
          );
        })}
      </Liste>
    </main>
  );
}

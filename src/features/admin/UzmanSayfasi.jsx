"use client";

import { buttonClass } from "@/components/ui/buttonClass";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { BackButton } from "@/components/ui/BackButton";
import { ListHead } from "@/components/ui/Row";
import { LoadFail } from "@/components/ui/LoadFail";
import { ListLoading } from "@/components/ui/Loader";
import { SheetTone } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { liveHead } from "@/features/liveScreen/fonts";
import { loadPrograms } from "@/features/fitness/fitnessData";
import { AKTIF_DURUM, DURUM, PAYLAS_AD, bransAd, branslar as bransListesi, doluluk, paylasilanPlanlar, sporAd, sporcuTakip, uzmanOzet, yasAd } from "@/lib/uzman";
import { todayStr } from "@/lib/utils/format";
import { Av, Etiket, UzmanForm } from "./Uzmanlar";

// Uzmanın sayfası (Seyhun 2026-11-27, örnek project-files/admin-sayfasi/uzman-bolumu.html): Admin › Uzmanlar'da uzmana dokununca
// açılır. Üstte özet (sporcu, bu hafta yapılma oranı, geride kalan), altında yeni gelen ve süren sporcular (programı, hafta
// kaçıncı, bu hafta kaç antrenman yaptı). Sporcuya dokununca programı, haftanın günleri, son antrenmanları ve sporcunun
// gönderdikleri (hedef, paylaştığı planlar, ders programı). "Program hazırla" Fitness'in ortak program penceresini o sporcuyla
// açar. Şimdilik ana hesap görür; ileride uzman kendi girişiyle (uzmanlar.uid, istek.uzmanUid; kurallar hazır).

const kisaGun = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
const gunYaz = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "short" });
const GUN = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const ST = { done: ["Yaptı", "text-ok"], skip: ["Atladı", "text-mut"], missed: ["Yapmadı", "text-[#ff6b6b]"], today: ["Bugün", "text-acc"], next: ["Sırada", "text-mut"] };
const Kart = ({ children, className = "" }) => <div className={`divide-y divide-line overflow-hidden rounded-[1.25rem] border border-line bg-card ${className}`}>{children}</div>;
const Bilgi = ({ ad, children }) => (
  <div className="flex min-h-[2.75rem] items-center justify-between gap-3 px-4 py-2 text-[0.9375rem]">
    <span className="shrink-0 text-mut">{ad}</span>
    <span className="min-w-0 truncate text-right">{children || "–"}</span>
  </div>
);
const Bar = ({ v, kotu }) => (
  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[#1f1f22]">
    <span className={`block h-full rounded-full ${kotu ? "bg-[#ff6b6b]" : "bg-acc"}`} style={{ width: `${Math.round(v * 100)}%` }} />
  </span>
);
const dugme = (main) =>
  `${buttonClass({ variant: main ? "primary" : "secondary", full: false })} flex-1`;

function Ust({ geri, href, baslik, tur, alt }) {
  return (
    <section className="pb-5 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <header className="flex items-center gap-2.5">
        {href ? <BackButton href={href} /> : <BackButton onClick={geri} />}
        <div className="min-w-0 flex-1 leading-tight">
          <h1 className="sahne-t truncate text-[2rem]">{baslik}</h1>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[0.8125rem] text-mut">
            {tur && <Etiket tur={tur} />}
            <span className="truncate">{alt}</span>
          </p>
        </div>
      </header>
    </section>
  );
}

export function UzmanSayfasi({ id }) {
  const { profile } = useAuth();
  const org = profile?.orgId;
  const router = useRouter();
  const { fitOthers = [] } = useData();
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState(false);
  const [sec, setSec] = useState("");
  const [bitenAcik, setBitenAcik] = useState(false);
  const [bilgiAcik, setBilgiAcik] = useState(false);
  const [form, setForm] = useState(false);
  const bugun = todayStr();
  const yukle = useCallback(async () => {
    try {
      const [u, i, p, a] = await Promise.all([
        getDoc(doc(db, "orgs", org, "uzmanlar", id)),
        getDocs(query(collection(db, "orgs", org, "uzmanIstekleri"), where("uzmanId", "==", id))),
        loadPrograms(org, { force: true }).catch(() => []),
        getDoc(doc(db, "orgs", org, "ayar", "uzmanlik")).catch(() => null),
      ]);
      setHata(false);
      setVeri({
        uzman: u.exists() ? { id: u.id, ...u.data() } : null,
        istekler: i.docs.map((d) => ({ id: d.id, ...d.data() })),
        programlar: p,
        ayar: a?.exists() ? a.data() : {},
      });
    } catch (e) {
      console.warn("[uzman]", e?.code || e?.message);
      setHata(true);
    }
  }, [org, id]);
  useEffect(() => {
    if (org) Promise.resolve().then(yukle);
  }, [org, yukle]);
  const ozet = useMemo(() => (veri ? uzmanOzet(veri.istekler, fitOthers, veri.programlar, bugun) : null), [veri, fitOthers, bugun]);

  if (profile?.role !== "owner") return null;
  const u = veri?.uzman;
  const ist = veri?.istekler || [];
  const liste = bransListesi(veri?.ayar);
  const guncelle = (iid, f) => setVeri((v) => ({ ...v, istekler: v.istekler.map((x) => (x.id === iid ? { ...x, ...f } : x)) }));
  // UzmanForm'un güncellemesi liste biçiminde ({ uzmanlar, istekler, ayar }); burada tek uzman
  const formGuncelle = (f) =>
    setVeri((v) => {
      const r = f({ uzmanlar: v.uzman ? [v.uzman] : [], istekler: v.istekler, ayar: v.ayar });
      const yeni = r.uzmanlar ? r.uzmanlar.find((x) => x.id === id) || null : v.uzman;
      if (!yeni) Promise.resolve().then(() => router.replace("/settings/admin/uzmanlar"));
      return { ...v, uzman: yeni, istekler: r.istekler || v.istekler, ayar: r.ayar || v.ayar };
    });
  const secili = sec && ist.find((i) => i.id === sec);
  const cls = `sahne-pg ${liveHead.variable} wide mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]`;

  if (secili) {
    return (
      <main className={cls}>
        <Sporcu org={org} i={secili} uzman={u} programlar={veri.programlar} plans={fitOthers} bugun={bugun} geri={() => setSec("")} guncelle={guncelle} />
      </main>
    );
  }
  // Atamak başlatmaktır (2026-11-27): atanan ve eski "kabul" olanlar birlikte "Sporcuları"
  const suren = ist.filter((i) => AKTIF_DURUM.includes(i.durum));
  const biten = ist.filter((i) => i.durum === "bitti");
  const satir = (i) => {
    const t = sporcuTakip(i, fitOthers, veri.programlar, bugun);
    return (
      <button key={i.id} type="button" onClick={() => setSec(i.id)} className="flex min-h-[3.75rem] w-full items-center gap-2.5 px-4 py-2.5 text-left transition active:bg-bg">
        <Av ad={i.sporcuAd} tur="s" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{i.sporcuAd || "Sporcu"}</span>
          <span className="block truncate text-[0.8125rem] text-mut">
            {t.prog ? [t.prog.title || "Program", t.hafta?.n > 0 && t.hafta.n <= t.hafta.of && `Hafta ${t.hafta.n}/${t.hafta.of}`].filter(Boolean).join(" · ") : [i.sure && `${i.sure} ay`, i.hedef].filter(Boolean).join(" · ") || "Program yok"}
          </span>
          {t.plan > 0 && <Bar v={t.yapti / t.plan} kotu={t.yapmadi > 0} />}
        </span>
        {i.durum === "bitti" ? null : !t.prog ? (
          <span className="shrink-0 rounded-full bg-accbg px-2 py-0.5 text-[0.6875rem] font-bold text-acc">Program yok</span>
        ) : t.plan ? (
          <span className={`shrink-0 text-[0.875rem] font-semibold tabular-nums ${t.yapmadi ? "text-[#ff6b6b]" : "text-mut"}`}>
            {t.yapti}/{t.plan}
          </span>
        ) : null}
        <span className="shrink-0 font-bold text-[#71717a]">›</span>
      </button>
    );
  };

  return (
    <SheetTone.Provider value="sahne">
      <main className={cls}>
        <Ust href="/settings/admin/uzmanlar" baslik={u?.ad || "Uzman"} tur={u ? "u" : ""} alt={u ? [bransAd(u.brans, liste), u.sehir, u.online && "online", `${doluluk(u.id, ist)}${u.kapasite ? `/${u.kapasite}` : ""} dolu`, u.ornek && "örnek"].filter(Boolean).join(" · ") : " "} />
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
                ["Sporcu", ozet.sporcu, ""],
                ["Bu hafta yapıldı", ozet.oran == null ? "–" : `%${ozet.oran}`, ozet.oran == null ? "" : ozet.oran >= 70 ? "text-ok" : "text-[#ff6b6b]"],
                ["Geride kalan", ozet.geride, ozet.geride ? "text-[#ff6b6b]" : ""],
              ].map(([k, n, c]) => (
                <div key={k} className="min-w-0 rounded-2xl border border-line bg-card px-3 py-2.5">
                  <p className={`sahne-t text-[2rem] tabular-nums ${c}`}>{n}</p>
                  <p className="truncate text-[0.75rem] text-mut">{k}</p>
                </div>
              ))}
            </div>
            <section>
              <ListHead title="Sporcuları" count={suren.length} />
              {suren.length ? (
                <Kart>
                  {suren.map(satir)}
                </Kart>
              ) : (
                <p className="rounded-[1.25rem] border border-line bg-card px-4 py-5 text-center text-[0.9375rem] text-mut">Henüz sporcusu yok.</p>
              )}
            </section>
            {biten.length > 0 && (
              <section>
                <ListHead title="Bitenler" count={biten.length} />
                <Kart>
                  {bitenAcik ? (
                    biten.map(satir)
                  ) : (
                    <button type="button" onClick={() => setBitenAcik(true)} className="flex min-h-[2.75rem] w-full items-center justify-between px-4 text-left text-[0.9375rem]">
                      Göster <span className="font-bold text-[#71717a]">›</span>
                    </button>
                  )}
                </Kart>
              </section>
            )}
            <section>
              <ListHead title="Uzman bilgileri" />
              <Kart>
                <button type="button" onClick={() => setBilgiAcik(!bilgiAcik)} aria-expanded={bilgiAcik} className="flex min-h-[2.75rem] w-full items-center justify-between px-4 text-left text-[0.9375rem]">
                  <span className="min-w-0 truncate">{(u.alt || []).join(", ") || bransAd(u.brans, liste)}</span>
                  <span className="font-bold text-[#71717a]">{bilgiAcik ? "⌃" : "›"}</span>
                </button>
                {bilgiAcik && (
                  <>
                    <Bilgi ad="Sporlar">{(u.sporlar || []).length ? u.sporlar.map(sporAd).join(", ") : "Hepsi"}</Bilgi>
                    <Bilgi ad="Yaş">{(u.yas || []).length ? u.yas.map(yasAd).join(", ") : "Hepsi"}</Bilgi>
                    <Bilgi ad="En çok sporcu">{u.kapasite || "Sınırsız"}</Bilgi>
                    <Bilgi ad="Telefon">{u.tel}</Bilgi>
                    <Bilgi ad="E-posta">{u.mail}</Bilgi>
                    <Bilgi ad="Giriş hesabı">{u.uid ? "Var" : "Henüz yok"}</Bilgi>
                    <Bilgi ad="Durum">{u.durum === "pasif" ? "Pasif (önerilmez)" : "Aktif"}</Bilgi>
                    {u.not && <p className="px-4 py-3 text-[0.875rem] leading-snug text-fg2">{u.not}</p>}
                  </>
                )}
              </Kart>
              <button type="button" onClick={() => setForm(true)} className={`${dugme(false)} mt-3 w-full`}>
                Uzmanı düzenle
              </button>
            </section>
          </div>
        )}
      </main>
      {u && <UzmanForm org={org} acik={form} u={u} liste={liste} ayar={veri.ayar} kapat={() => setForm(false)} guncelle={formGuncelle} />}
    </SheetTone.Provider>
  );
}

function Sporcu({ org, i, uzman, programlar, plans, bugun, geri, guncelle }) {
  const toast = useToast();
  const { plans: tumPlanlar } = useData();
  const [paylasAcik, setPaylasAcik] = useState(false);
  const t = useMemo(() => sporcuTakip(i, plans, programlar, bugun), [i, plans, programlar, bugun]);
  const paylasilan = useMemo(() => paylasilanPlanlar(tumPlanlar, i.sporcuUid, i.paylas, bugun), [tumPlanlar, i.sporcuUid, i.paylas, bugun]);
  const ask = useConfirm();
  const aktif = AKTIF_DURUM.includes(i.durum);
  // Bitir: sunucu isteği kapatır, sporcunun uzmanını geçmişe taşır (fitUzmanGecmis)
  const bitir = () =>
    ask({
      title: "Uzmanla çalışma bitsin mi?",
      text: `${i.sporcuAd || "Sporcu"} artık ${uzman?.ad || "bu uzman"} ile çalışmıyor görünür. Programı ve antrenmanları kalır.`,
      yes: "Bitir",
      run: async () => {
        const r = await authFetch("/api/uzman-istek", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ orgId: org, id: i.id, bitir: true }) });
        if (!r.ok) return toast?.("Bitirilemedi");
        guncelle(i.id, { durum: "bitti", bitti: bugun });
        toast?.("Uzmanla çalışma bitti");
      },
    });
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
  const hazirla = i.sporcuUid && !i.ornek ? `/settings/admin/uzman/${uzman?.id}/program/${i.id}` : "";
  return (
    <>
      <Ust geri={geri} baslik={i.sporcuAd || "Sporcu"} tur="s" alt={[i.yas && `${i.yas} yaş`, i.spor && sporAd(i.spor === "sailing" ? "yelken" : i.spor)].filter(Boolean).join(" · ")} />
      <div className="space-y-5">
        <Kart>
          <div className="flex items-center gap-2.5 px-4 py-3">
            <Av ad={uzman?.ad} tur="u" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{aktif ? `${uzman?.ad || "Uzman"} ile çalışıyor` : `${uzman?.ad || "Uzman"} ile çalıştı`}</span>
              <span className="block truncate text-[0.8125rem] text-mut">
                {aktif
                  ? [i.bas && `${kisaGun(i.bas)}'tan beri`, i.sure && `${i.sure} ay`, i.bit && `bitiş ${kisaGun(i.bit)}`].filter(Boolean).join(" · ")
                  : [DURUM[i.durum], i.bitti && kisaGun(i.bitti)].filter(Boolean).join(" · ")}
              </span>
            </span>
          </div>
        </Kart>
        <section>
          <ListHead title="Program" />
          <Kart>
            {t.prog ? (
              <div className="px-4 py-3">
                <p className="truncate font-medium">{t.prog.title || "Program"}</p>
                {t.prog.by?.ad && (
                  <p className="mt-1 flex items-center gap-1.5 text-[0.8125rem] text-fg2">
                    <span className="rounded-md bg-acc/15 px-1.5 py-px text-[0.625rem] font-bold tracking-[0.06em] text-acc">HAZIRLAYAN</span>
                    {t.prog.by.ad}
                  </p>
                )}
                <p className="truncate text-[0.8125rem] text-mut">
                  {[`${t.prog.weeks} hafta`, t.prog.days?.length && `haftada ${t.prog.days.length} gün`, t.hafta && (t.hafta.n === 0 ? "henüz başlamadı" : t.hafta.n > t.hafta.of ? "bitti" : `şu an hafta ${t.hafta.n}`)].filter(Boolean).join(" · ")}
                </p>
              </div>
            ) : (
              <p className="px-4 py-3 text-[0.9375rem] text-mut">Henüz program yok.</p>
            )}
          </Kart>
        </section>
        <section>
          <ListHead title={t.plan ? `Bu hafta · ${t.yapti}/${t.plan}` : "Bu hafta"} />
          <Kart>
            <div className="grid grid-cols-7 gap-1.5 px-3 py-3">
              {t.gunler.map((g, k) => (
                <div key={g.d} className="text-center text-[0.6875rem] text-mut">
                  {GUN[k]}
                  <span
                    className={`mt-1 block h-7 rounded-lg ${g.st === "done" ? "bg-acc" : g.st === "missed" ? "bg-[#ff6b6b]/50" : g.st ? "bg-[#2a2a2f]" : "bg-[#1a1a1d]"} ${g.bugun ? "outline outline-[1.5px] outline-acc" : ""}`}
                    aria-label={g.st ? ST[g.st][0] : "Antrenman yok"}
                  />
                </div>
              ))}
            </div>
          </Kart>
        </section>
        {t.son.length > 0 && (
          <section>
            <ListHead title="Son antrenmanlar" />
            <Kart>
              {t.son.map((p) => {
                const st = p.fit?.res?.st === "done" ? "done" : p.fit?.res?.st === "skip" ? "skip" : "missed";
                const r = p.fit?.res;
                return (
                  <div key={p.id} className="flex min-h-[3.25rem] items-center gap-3 px-4 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {gunYaz(p.date)} · {p.fit?.name || p.title}
                      </span>
                      {st === "done" && (r?.min || r?.note) && <span className="block truncate text-[0.8125rem] text-mut">{[r.min && `${r.min} dk`, r.note && `"${r.note}"`].filter(Boolean).join(" · ")}</span>}
                    </span>
                    <span className={`shrink-0 text-[0.875rem] font-semibold ${ST[st][1]}`}>{ST[st][0]}</span>
                  </div>
                );
              })}
            </Kart>
          </section>
        )}
        <section>
          <ListHead title="Sporcunun gönderdikleri" />
          <Kart>
            <Bilgi ad="Hedef">{i.hedef}</Bilgi>
            <Bilgi ad="Spor">{[i.spor && sporAd(i.spor === "sailing" ? "yelken" : i.spor), i.yas && `${i.yas} yaş`].filter(Boolean).join(" · ")}</Bilgi>
            <button type="button" onClick={() => i.paylas?.acik && setPaylasAcik(!paylasAcik)} aria-expanded={paylasAcik} className="block w-full text-left">
              <Bilgi ad="Paylaştığı planlar">{i.paylas?.acik ? <span className="text-acc">{(i.paylas.turler || []).map((x) => PAYLAS_AD[x] || x).join(", ")} ›</span> : "Paylaşmadı"}</Bilgi>
            </button>
            {paylasAcik && (
              <div className="space-y-1 px-4 py-3 text-[0.875rem]">
                {paylasilan.length ? (
                  paylasilan.slice(0, 15).map((p) => (
                    <div key={p.id} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">{p.title || "Plan"}</span>
                      <span className="shrink-0 tabular-nums text-mut">
                        {gunYaz(p.date)}
                        {p.time ? ` ${p.time}` : ""}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-mut">Önümüzdeki 3 haftada plan yok.</p>
                )}
              </div>
            )}
            {i.ders ? (
              <button type="button" onClick={ders} className="block w-full text-left">
                <Bilgi ad="Ders programı">
                  <span className="text-acc">{i.ders.ad || i.ders.name || "Dosya"} ›</span>
                </Bilgi>
              </button>
            ) : (
              <Bilgi ad="Ders programı">Yok</Bilgi>
            )}
          </Kart>
        </section>
        {aktif && (
          <div>
            {hazirla ? (
              <Link href={hazirla} className="sahne-t flex h-[3.25rem] w-full items-center justify-center rounded-2xl bg-acc text-[1.3rem] text-[#111] shadow-[0_4px_0_#8ea620] transition active:translate-y-[3px]">
                {t.prog ? "Yeni program hazırla" : "Program hazırla"}
              </Link>
            ) : (
              <p className="text-center text-[0.875rem] text-mut">Örnek sporcuya program hazırlanamaz.</p>
            )}
            <button type="button" onClick={bitir} className="mt-2 flex h-11 w-full items-center justify-center text-[0.875rem] font-semibold text-mut">
              ⋯ Uzmanla çalışmayı bitir
            </button>
          </div>
        )}
      </div>
    </>
  );
}

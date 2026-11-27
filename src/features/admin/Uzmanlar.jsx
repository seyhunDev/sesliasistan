"use client";

import { buttonClass } from "@/components/ui/buttonClass";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { AddButton } from "@/components/ui/AddButton";
import { BackButton } from "@/components/ui/BackButton";
import { ListHead } from "@/components/ui/Row";
import { LoadFail } from "@/components/ui/LoadFail";
import { ListLoading } from "@/components/ui/Loader";
import { Sheet, SheetActions, SheetTone } from "@/components/ui/Sheet";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { liveHead } from "@/features/liveScreen/fonts";
import { todayStr } from "@/lib/utils/format";
import {
  AKTIF_DURUM, DURUM, ORNEK_ISTEKLER, ORNEK_UZMANLAR, PAYLAS_AD, SPORLAR, YASLAR,
  bransAd, branslar as bransListesi, kimlik, oneriler, sporAd, uzmanOzet, uzmanTemizle,
} from "@/lib/uzman";

// Admin › Uzmanlar (Seyhun 2026-11-27 "yap", örnek project-files/admin-sayfasi/uzmanlar.html): üstte bekleyen sporcu istekleri,
// altında branş branş uzman antrenörler; "+ Uzman" ile ekleme, uzmana dokununca detay, isteğe dokununca puanlı öneriler ve atama.
// Veri lib/uzman.js; istekleri sporcu tarafı (Fitness › Uzmanla çalış) /api/uzman-istek ile yazar.

const kisaAd = (s) =>
  String(s || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toLocaleUpperCase("tr");
// Uzman yeşil, sporcu mavi: kim kim, bir bakışta (Seyhun 2026-11-27 "kim uzman, kim sporcu anlamıyorum")
export const Av = ({ ad, big, tur }) => (
  <span
    className={`grid shrink-0 place-items-center rounded-full font-bold ${big ? "size-14 bg-acc text-[1.1rem] text-[#111]" : `size-9 text-[0.8125rem] ${tur === "u" ? "bg-acc/15 text-acc" : tur === "s" ? "bg-[#60a5fa]/20 text-[#93c5fd]" : "bg-[#26262b] text-fg2"}`}`}
  >
    {kisaAd(ad)}
  </span>
);
export const Etiket = ({ tur }) => (
  <span className={`shrink-0 rounded-md px-1.5 py-px text-[0.625rem] font-bold tracking-[0.06em] ${tur === "u" ? "bg-acc/15 text-acc" : "bg-[#60a5fa]/20 text-[#93c5fd]"}`}>{tur === "u" ? "UZMAN" : "SPORCU"}</span>
);
const Liste = ({ children }) => <div className="divide-y divide-line overflow-hidden rounded-[1.25rem] border border-line bg-card">{children}</div>;
const Bilgi = ({ ad, children }) => (
  <div className="flex min-h-[2.75rem] items-center justify-between gap-3 px-4 py-2 text-[0.9375rem]">
    <span className="shrink-0 text-mut">{ad}</span>
    <span className="min-w-0 truncate text-right">{children || "–"}</span>
  </div>
);
const Hap = ({ on, children, onClick }) => {
  const c = `rounded-full border px-3 py-1 text-[0.8125rem] font-semibold transition ${on ? "border-acc bg-acc text-[#111]" : "border-line bg-[#1f1f22] text-fg2"}`;
  return onClick ? (
    <button type="button" aria-pressed={!!on} onClick={onClick} className={c}>
      {children}
    </button>
  ) : (
    <span className={c}>{children}</span>
  );
};
const Durum = ({ d }) =>
  d === "bekliyor" || d === "atandi" ? (
    <span className="shrink-0 rounded-full bg-acc px-2 py-0.5 text-[0.6875rem] font-bold text-[#111]">{d === "bekliyor" ? "Ata" : "Yeni"}</span>
  ) : d === "kabul" ? (
    <span className="shrink-0 rounded-full bg-accbg px-2 py-0.5 text-[0.6875rem] font-bold text-acc">Sürüyor</span>
  ) : (
    <span className="shrink-0 rounded-full bg-[#1f1f22] px-2 py-0.5 text-[0.6875rem] font-bold text-mut">{DURUM[d] || d}</span>
  );

function useUzmanVeri(org) {
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState(false);
  const yukle = useCallback(async () => {
    try {
      const [u, i, a] = await Promise.all([
        getDocs(collection(db, "orgs", org, "uzmanlar")),
        getDocs(query(collection(db, "orgs", org, "uzmanIstekleri"), orderBy("at", "desc"), limit(200))),
        getDoc(doc(db, "orgs", org, "ayar", "uzmanlik")),
      ]);
      setHata(false);
      setVeri({ uzmanlar: u.docs.map((d) => ({ id: d.id, ...d.data() })), istekler: i.docs.map((d) => ({ id: d.id, ...d.data() })), ayar: a.exists() ? a.data() : {} });
    } catch (e) {
      console.warn("[uzmanlar]", e?.code || e?.message);
      setHata(true);
    }
  }, [org]);
  useEffect(() => {
    Promise.resolve().then(yukle);
  }, [yukle]);
  return { veri, setVeri, hata, yukle };
}

// Ayrı sayfa /settings/admin/uzmanlar (Seyhun 2026-11-27): geri Admin'e döner
export function UzmanlarSayfasi() {
  const { profile } = useAuth();
  if (profile?.role !== "owner") return null;
  return (
    <main className={`sahne-pg ${liveHead.variable} wide mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]`}>
      <Uzmanlar org={profile.orgId} />
    </main>
  );
}

export function Uzmanlar({ org }) {
  const { veri, setVeri, hata, yukle } = useUzmanVeri(org);
  const [gor, setGor] = useState({ t: "liste" });
  const [form, setForm] = useState(null); // null | {} (yeni) | uzman (düzenle)
  // Her görünümde tek başlık ve tek geri (Seyhun 2026-11-27): listede "Uzmanlar" (geri Admin), istekte sporcunun adı (geri liste)
  const anaUst = <Ust href="/settings/admin" baslik="Uzmanlar" alt="Uzman antrenörler ve sporcuları" />;
  if (hata)
    return (
      <>
        {anaUst}
        <LoadFail onRetry={yukle} />
      </>
    );
  if (!veri)
    return (
      <>
        {anaUst}
        <ListLoading height="16rem" />
      </>
    );
  const liste = bransListesi(veri.ayar);
  const guncelle = (f) => setVeri((v) => ({ ...v, ...f(v) }));
  const istek = gor.t === "istek" && veri.istekler.find((i) => i.id === gor.id);
  return (
    <SheetTone.Provider value="sahne">
      {istek ? (
        <IstekDetay org={org} i={istek} veri={veri} liste={liste} geri={() => setGor({ t: "liste" })} guncelle={guncelle} />
      ) : (
        <>
          {anaUst}
          <UzmanListe org={org} veri={veri} liste={liste} ac={setGor} yeni={() => setForm({})} guncelle={guncelle} />
        </>
      )}
      <UzmanForm org={org} acik={!!form} u={form} liste={liste} ayar={veri.ayar} kapat={() => setForm(null)} guncelle={guncelle} />
    </SheetTone.Provider>
  );
}

// Uzman satırının sağı: kaç sporcusu var, bu hafta antrenmanlarının yüzde kaçı yapıldı
function UzmanSag({ u, istekler }) {
  const { fitOthers = [] } = useData();
  const o = uzmanOzet(istekler.filter((i) => i.uzmanId === u.id), fitOthers, [], todayStr());
  return (
    <span className="shrink-0 text-right text-[0.8125rem] leading-tight tabular-nums">
      <span className="block text-fg2">{o.sporcu ? `${o.sporcu} sporcu` : "Sporcusu yok"}</span>
      {o.oran != null && <span className={`block ${o.oran >= 70 ? "text-ok" : "text-[#ff6b6b]"}`}>%{o.oran} yapıldı</span>}
    </span>
  );
}

function UzmanListe({ org, veri, liste, ac, yeni, guncelle }) {
  const [sec, setSec] = useState("");
  const ask = useConfirm();
  const toast = useToast();
  const { uzmanlar, istekler } = veri;
  const bekleyen = istekler.filter((i) => i.durum === "bekliyor");
  const sayi = (id) => uzmanlar.filter((u) => u.brans === id).length;
  const gruplar = liste.filter((b) => sayi(b.id) && (!sec || sec === b.id));
  const ornek = uzmanlar.filter((u) => u.ornek).length + istekler.filter((i) => i.ornek).length;

  const ornekEkle = async () => {
    const b = writeBatch(db);
    const now = serverTimestamp();
    ORNEK_UZMANLAR.forEach(({ id, ...u }) => b.set(doc(db, "orgs", org, "uzmanlar", id), { ...u, at: now }));
    ORNEK_ISTEKLER.forEach(({ id, ...i }) => b.set(doc(db, "orgs", org, "uzmanIstekleri", id), { ...i, at: now, guncel: now }));
    try {
      await b.commit();
      const t = { toMillis: () => Date.now(), toDate: () => new Date() };
      guncelle((v) => ({
        uzmanlar: [...v.uzmanlar.filter((u) => !u.ornek), ...ORNEK_UZMANLAR.map((u) => ({ ...u, at: t }))],
        istekler: [...ORNEK_ISTEKLER.map((i) => ({ ...i, at: t })), ...v.istekler.filter((i) => !i.ornek)],
      }));
    } catch {
      toast?.("Eklenemedi");
    }
  };
  const ornekSil = () =>
    ask({
      title: "Örnek veri silinsin mi?",
      text: `${ornek} örnek kayıt silinir. Gerçek uzmanlar ve istekler kalır.`,
      run: async () => {
        const b = writeBatch(db);
        uzmanlar.filter((u) => u.ornek).forEach((u) => b.delete(doc(db, "orgs", org, "uzmanlar", u.id)));
        istekler.filter((i) => i.ornek).forEach((i) => b.delete(doc(db, "orgs", org, "uzmanIstekleri", i.id)));
        await b.commit();
        guncelle((v) => ({ uzmanlar: v.uzmanlar.filter((u) => !u.ornek), istekler: v.istekler.filter((i) => !i.ornek) }));
      },
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.875rem] text-mut">{uzmanlar.length ? `${uzmanlar.length} uzman` : "Henüz uzman yok"}</p>
        <AddButton onClick={yeni} label="Uzman ekle">
          Uzman
        </AddButton>
      </div>
      {bekleyen.length > 0 && (
        <section>
          <ListHead title="Uzman bekleyen sporcular" count={bekleyen.length} />
          <div className="divide-y divide-line overflow-hidden rounded-[1.25rem] border border-acc bg-card">
            {bekleyen.map((i) => (
              <button key={i.id} type="button" onClick={() => ac({ t: "istek", id: i.id })} className="flex min-h-[3.25rem] w-full items-center gap-2.5 px-4 py-2 text-left transition active:bg-bg">
                <Av ad={i.sporcuAd} tur="s" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{i.sporcuAd || "Sporcu"}</span>
                  <span className="block truncate text-[0.8125rem] text-mut">
                    {[`${bransAd(i.brans, liste)} uzmanı istiyor`, i.sure && `${i.sure} ay`].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <Durum d={i.durum} />
              </button>
            ))}
          </div>
        </section>
      )}
      {uzmanlar.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <Hap on={!sec} onClick={() => setSec("")}>
            Hepsi
          </Hap>
          {liste.filter((b) => sayi(b.id)).map((b) => (
            <Hap key={b.id} on={sec === b.id} onClick={() => setSec(sec === b.id ? "" : b.id)}>
              {b.ad} {sayi(b.id)}
            </Hap>
          ))}
        </div>
      )}
      {gruplar.map((b) => (
        <section key={b.id}>
          <ListHead title={b.ad} />
          <Liste>
            {uzmanlar
              .filter((u) => u.brans === b.id)
              .sort((x, y) => (x.durum === "pasif") - (y.durum === "pasif") || String(x.ad).localeCompare(String(y.ad), "tr"))
              .map((u) => (
                <Link key={u.id} href={`/settings/admin/uzman/${u.id}`} className="flex min-h-[3.5rem] w-full items-center gap-2.5 px-4 py-2 text-left transition active:bg-bg">
                  <Av ad={u.ad} tur="u" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{u.ad}</span>
                    <span className="block truncate text-[0.8125rem] text-mut">{[bransAd(u.brans, liste), u.sehir, u.online && "online"].filter(Boolean).join(" · ")}</span>
                  </span>
                  {u.durum === "pasif" ? (
                    <span className="rounded-full bg-[#1f1f22] px-2 py-0.5 text-[0.6875rem] font-bold text-mut">Pasif</span>
                  ) : (
                    <UzmanSag u={u} istekler={istekler} />
                  )}
                  <span className="shrink-0 font-bold text-[#71717a]">›</span>
                </Link>
              ))}
          </Liste>
        </section>
      ))}
      {!uzmanlar.length && (
        <p className="rounded-[1.25rem] border border-line bg-card px-4 py-6 text-center text-[0.9375rem] text-mut">&quot;+ Uzman&quot; ile ilk uzman antrenörü ekle ya da örnek veriyle dene.</p>
      )}
      <div className="flex justify-center">
        {ornek ? (
          <button type="button" onClick={ornekSil} className="px-3 py-2 text-[0.8125rem] font-semibold text-rec">
            Örnek veriyi sil ({ornek})
          </button>
        ) : (
          <button type="button" onClick={ornekEkle} className="px-3 py-2 text-[0.8125rem] font-semibold text-mut">
            Örnek veri ekle
          </button>
        )}
      </div>
    </div>
  );
}

// Sayfa başlığı: uzmanın sayfasıyla aynı (geri + büyük ad + bir satır)
function Ust({ href, geri, baslik, tur, alt }) {
  return (
    <section className="pb-5 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <header className="flex items-center gap-2.5">
        {href ? <BackButton href={href} /> : <BackButton onClick={geri} />}
        <div className="min-w-0 flex-1 leading-tight">
          <h1 className="sahne-t truncate text-[2rem]">{baslik}</h1>
          {(alt || tur) && (
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[0.8125rem] text-mut">
              {tur && <Etiket tur={tur} />}
              <span className="truncate">{alt}</span>
            </p>
          )}
        </div>
      </header>
    </section>
  );
}

function IstekDetay({ org, i, veri, liste, geri, guncelle }) {
  const toast = useToast();
  const ask = useConfirm();
  const [hepsi, setHepsi] = useState(false);
  const oner = useMemo(() => oneriler(veri.uzmanlar, i, veri.istekler), [veri, i]);
  const atanan = veri.uzmanlar.find((u) => u.id === i.uzmanId);
  const yaz = async (f) => {
    const eski = veri.istekler;
    guncelle((v) => ({ istekler: v.istekler.map((x) => (x.id === i.id ? { ...x, ...f } : x)) }));
    try {
      await updateDoc(doc(db, "orgs", org, "uzmanIstekleri", i.id), { ...f, guncel: serverTimestamp() });
    } catch {
      guncelle(() => ({ istekler: eski }));
      toast?.("Kaydedilemedi");
    }
  };
  const [secili, setSecili] = useState("");
  const [degis, setDegis] = useState(false);
  const [bekle, setBekle] = useState(false);
  const secId = secili || (!degis && oner[0]?.u.id) || "";
  const secU = veri.uzmanlar.find((u) => u.id === secId);
  // Atamak başlatmaktır (Seyhun 2026-11-27): sunucu isteğe başlangıç/bitişi, sporcunun kaydına uzmanını (fitUzman) yazar
  const ata = async (u) => {
    setBekle(true);
    try {
      const r = await authFetch("/api/uzman-istek", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ orgId: org, id: i.id, ata: u.id }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error);
      guncelle((v) => ({ istekler: v.istekler.map((x) => (x.id === i.id ? { ...x, uzmanId: u.id, uzmanUid: u.uid || null, durum: "atandi", bas: j.istek?.bas, bit: j.istek?.bit } : x)) }));
      setDegis(false);
      setSecili("");
      toast?.(`${u.ad} atandı, çalışma başladı`);
    } catch (e) {
      toast?.(e.message || "Atanamadı");
    } finally {
      setBekle(false);
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
  const gosterilen = hepsi ? oner : oner.slice(0, 3);
  return (
    <div className="space-y-5">
      <Ust geri={geri} baslik={i.sporcuAd || "Sporcu"} tur="s" alt={[DURUM[i.durum] || i.durum, i.yas && `${i.yas} yaş`].filter(Boolean).join(" · ")} />
      <Liste>
        <Bilgi ad="Branş">{bransAd(i.brans, liste)}</Bilgi>
        <Bilgi ad="Spor">{i.spor ? sporAd(i.spor) : ""}</Bilgi>
        <Bilgi ad="Süre">{i.sure ? `${i.sure} ay` : ""}</Bilgi>
        <Bilgi ad="Hedef">{i.hedef}</Bilgi>
        {i.ders ? (
          <button type="button" onClick={ders} className="block w-full text-left transition active:bg-bg">
            <Bilgi ad="Ders programı">
              <span className="text-acc">{i.ders.ad || i.ders.name || "Dosya"} ›</span>
            </Bilgi>
          </button>
        ) : (
          <Bilgi ad="Ders programı">Yok</Bilgi>
        )}
        <Bilgi ad="Planlarını paylaşıyor">{i.paylas?.acik && i.paylas.turler?.length ? i.paylas.turler.map((t) => PAYLAS_AD[t] || t).join(", ") : "Hayır"}</Bilgi>
        <Bilgi ad="Durum">{atanan && i.durum !== "bekliyor" ? `${DURUM[i.durum] || i.durum} · ${atanan.ad}` : DURUM[i.durum] || i.durum}</Bilgi>
      </Liste>
      {!["ret", "bitti", "iptal"].includes(i.durum) && (
        <section>
          {atanan && !degis ? (
            <>
              <ListHead title="Atanan uzman" />
              <div className="rounded-[1.25rem] border border-acc bg-card px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Av ad={atanan.ad} tur="u" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{atanan.ad}</span>
                    <span className="block truncate text-[0.8125rem] text-mut">{[bransAd(atanan.brans, liste), DURUM[i.durum]].filter(Boolean).join(" · ")}</span>
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/settings/admin/uzman/${atanan.id}`} className={buttonClass({ variant: "primary", size: "sm", full: false })}>
                    Uzmanın sayfası
                  </Link>
                  <button type="button" onClick={() => (setSecili(""), setDegis(true))} className={buttonClass({ variant: "secondary", size: "sm", full: false })}>
                    Değiştir
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <ListHead title="Önerilen uzmanlar" />
              {oner.length ? (
                <>
                  <div role="radiogroup" aria-label="Uzman seç" className="divide-y divide-line overflow-hidden rounded-[1.25rem] border border-line bg-card">
                    {gosterilen.map(({ u, p }) => {
                      const on = secId === u.id;
                      return (
                        <button key={u.id} type="button" role="radio" aria-checked={on} onClick={() => setSecili(u.id)} className={`flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2 text-left transition active:bg-bg ${on ? "bg-accbg" : ""}`}>
                          <span className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${on ? "border-acc bg-acc" : "border-[#52525b]"}`}>{on && <span className="size-2 rounded-full bg-[#111]" />}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{u.ad}</span>
                            <span className="block truncate text-[0.75rem] text-mut">{p.neden.join(" · ")}</span>
                          </span>
                          <span className="sahne-t w-10 shrink-0 text-right text-[1.4rem] text-acc tabular-nums">{p.puan}</span>
                        </button>
                      );
                    })}
                    {oner.length > 3 && !hepsi && (
                      <button type="button" onClick={() => setHepsi(true)} className="block w-full px-4 py-2.5 text-left text-[0.875rem] font-semibold text-mut">
                        Hepsi ({oner.length})
                      </button>
                    )}
                  </div>
                  {secU && (
                    <button type="button" disabled={bekle} onClick={() => ata(secU)} className="sahne-t mt-3 h-[3.25rem] w-full rounded-2xl bg-acc text-[1.3rem] text-[#111] shadow-[0_4px_0_#8ea620] transition active:translate-y-[3px] disabled:opacity-50">
                      {secU.ad} ata
                    </button>
                  )}
                  {degis && (
                    <button type="button" onClick={() => setDegis(false)} className="mt-1 h-10 w-full text-[0.875rem] font-semibold text-mut">
                      Vazgeç
                    </button>
                  )}
                </>
              ) : (
                <p className="px-1 text-[0.875rem] text-mut">Bu branşta uygun uzman yok. &quot;+ Uzman&quot; ile ekleyebilirsin.</p>
              )}
            </>
          )}
        </section>
      )}
      <div className="flex flex-wrap gap-2">
        {i.durum === "atandi" && (
          <button type="button" onClick={() => yaz({ durum: "kabul" })} className={buttonClass({ variant: "primary", size: "sm", full: false })}>
            Başladı
          </button>
        )}
        {i.durum === "kabul" && (
          <button type="button" onClick={() => yaz({ durum: "bitti" })} className={buttonClass({ variant: "secondary", size: "sm", full: false })}>
            Bitti
          </button>
        )}
        {i.durum === "bekliyor" && (
          <button
            type="button"
            onClick={() => ask({ title: "İstek reddedilsin mi?", yes: "Reddet", run: () => yaz({ durum: "ret" }) })}
            className="ml-auto px-2 py-2 text-[0.8125rem] font-semibold text-rec"
          >
            Reddet
          </button>
        )}
        {["ret", "bitti", "iptal"].includes(i.durum) && (
          <button type="button" onClick={() => yaz({ durum: "bekliyor", uzmanId: null, uzmanUid: null })} className="px-2 py-2 text-[0.8125rem] font-semibold text-mut">
            Yeniden aç
          </button>
        )}
      </div>
    </div>
  );
}

const inputCls = "h-11 w-full rounded-xl border border-line bg-[#1f1f22] px-3.5 text-[0.9375rem] text-fg outline-none placeholder:text-mut/70 focus:border-acc";
const Alan = ({ ad, children }) => (
  <div className="space-y-1.5">
    <p className="text-[0.8125rem] font-medium text-mut">{ad}</p>
    {children}
  </div>
);

// Yeni ya da düzenlenen uzman. Branş ve uzmanlık listesine "+" ile yeni ad eklenir (ayar/uzmanlik'e yazılır, bir dahakine listede)
export function UzmanForm({ org, acik, u, liste, ayar, kapat, guncelle }) {
  const toast = useToast();
  const ask = useConfirm();
  const [f, setF] = useState(null);
  const [yeniB, setYeniB] = useState("");
  const [yeniE, setYeniE] = useState("");
  const [bekle, setBekle] = useState(false);
  const bos = { ad: "", brans: "fitness", alt: [], sporlar: [], yas: [], sehir: "", online: false, kapasite: "", tel: "", mail: "", not: "", durum: "aktif" };
  const [ilk, setIlk] = useState(null);
  if (acik && u !== ilk) {
    setIlk(u);
    setF({ ...bos, ...(u || {}) });
    setYeniB("");
    setYeniE("");
  }
  if (!acik && ilk) setIlk(null);
  const k = f || bos;
  const set = (o) => setF((x) => ({ ...x, ...o }));
  const ac = (key, v) => set({ [key]: k[key].includes(v) ? k[key].filter((x) => x !== v) : [...k[key], v] });
  const [ekB, setEkB] = useState([]); // bu pencerede eklenen yeni branşlar
  const tum = [...liste, ...ekB.filter((b) => !liste.some((x) => x.id === b.id))];
  const brans = tum.find((b) => b.id === k.brans);
  const etiketler = [...new Set([...(brans?.alt || []), ...k.alt])];

  const bransEkle = () => {
    const ad = yeniB.trim();
    if (!ad) return;
    const id = kimlik(ad);
    if (!tum.some((b) => b.id === id)) setEkB((l) => [...l, { id, ad, alt: [] }]);
    set({ brans: id, alt: [] });
    setYeniB("");
  };
  const etiketEkle = () => {
    const t = yeniE.trim().replace(/\s+/g, " ").slice(0, 30);
    if (t && !k.alt.includes(t)) set({ alt: [...k.alt, t] });
    setYeniE("");
  };
  const kaydet = async () => {
    const r = uzmanTemizle(k);
    if (r.hata) return toast?.(r.hata);
    setBekle(true);
    try {
      const data = { ...r.veri, guncel: serverTimestamp() };
      let id = u?.id;
      if (id) await updateDoc(doc(db, "orgs", org, "uzmanlar", id), data);
      else id = (await addDoc(collection(db, "orgs", org, "uzmanlar"), { ...data, uid: null, ornek: false, at: serverTimestamp() })).id;
      // Yeni branş ya da kod listesinde olmayan etiket: ayar/uzmanlik'e
      const kayitli = ayar?.branslar || [];
      const varsay = liste.find((b) => b.id === r.veri.brans);
      const yeniEt = r.veri.alt.filter((t) => !varsay?.alt.includes(t));
      let ayarYeni = null;
      if (!varsay || yeniEt.length) {
        const e = kayitli.find((b) => b.id === r.veri.brans) || { id: r.veri.brans, ad: brans?.ad || r.veri.brans, alt: [] };
        const ek = { ...e, alt: [...new Set([...(e.alt || []), ...yeniEt])] };
        ayarYeni = { branslar: [...kayitli.filter((b) => b.id !== ek.id), ek] };
        await setDoc(doc(db, "orgs", org, "ayar", "uzmanlik"), ayarYeni, { merge: true });
      }
      const t = { toMillis: () => Date.now(), toDate: () => new Date() };
      guncelle((v) => ({
        uzmanlar: u ? v.uzmanlar.map((x) => (x.id === id ? { ...x, ...r.veri } : x)) : [...v.uzmanlar, { id, ...r.veri, uid: null, ornek: false, at: t }],
        ...(ayarYeni ? { ayar: { ...v.ayar, ...ayarYeni } } : {}),
      }));
      toast?.(u ? "Kaydedildi" : `${r.veri.ad} eklendi`);
      setEkB([]);
      kapat();
    } catch {
      toast?.("Kaydedilemedi, bağlantını kontrol et");
    } finally {
      setBekle(false);
    }
  };
  const sil = () =>
    ask({
      title: `${u.ad} silinsin mi?`,
      text: "Uzmana atanmış istekler \"Uzman bekleniyor\"a döner.",
      run: async () => {
        const b = writeBatch(db);
        b.delete(doc(db, "orgs", org, "uzmanlar", u.id));
        const atanmis = await getDocs(query(collection(db, "orgs", org, "uzmanIstekleri"), where("uzmanId", "==", u.id)));
        atanmis.docs.forEach((d) => AKTIF_DURUM.includes(d.data().durum) && b.update(d.ref, { uzmanId: null, uzmanUid: null, durum: "bekliyor", guncel: serverTimestamp() }));
        await b.commit();
        guncelle((v) => ({
          uzmanlar: v.uzmanlar.filter((x) => x.id !== u.id),
          istekler: v.istekler.map((x) => (x.uzmanId === u.id && AKTIF_DURUM.includes(x.durum) ? { ...x, uzmanId: null, durum: "bekliyor" } : x)),
        }));
        kapat();
      },
    });

  return (
    <Sheet
      open={acik}
      onClose={kapat}
      title={u?.id ? "Uzmanı düzenle" : "Yeni uzman"}
      footer={<SheetActions onCancel={kapat} onDelete={u?.id ? sil : undefined} onYes={kaydet} yes={bekle ? "Kaydediliyor…" : "Kaydet"} disabled={bekle} />}
    >
      <div className="space-y-4 pb-2">
        <Alan ad="Ad soyad">
          <input className={inputCls} value={k.ad} onChange={(e) => set({ ad: e.target.value })} placeholder="Örn. Selin Er" autoComplete="off" maxLength={60} />
        </Alan>
        <Alan ad="Branş">
          <div className="flex flex-wrap gap-1.5">
            {tum.map((b) => (
              <Hap key={b.id} on={k.brans === b.id} onClick={() => set({ brans: b.id, alt: k.brans === b.id ? k.alt : [] })}>
                {b.ad}
              </Hap>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={inputCls} value={yeniB} onChange={(e) => setYeniB(e.target.value)} onKeyDown={(e) => e.key === "Enter" && bransEkle()} placeholder="Yeni branş" maxLength={30} />
            <button type="button" onClick={bransEkle} disabled={!yeniB.trim()} className="shrink-0 rounded-xl bg-[#1f1f22] px-3.5 text-[0.875rem] font-bold disabled:opacity-40">
              + Branş
            </button>
          </div>
        </Alan>
        <Alan ad="Uzmanlık">
          {etiketler.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {etiketler.map((t) => (
                <Hap key={t} on={k.alt.includes(t)} onClick={() => ac("alt", t)}>
                  {t}
                </Hap>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input className={inputCls} value={yeniE} onChange={(e) => setYeniE(e.target.value)} onKeyDown={(e) => e.key === "Enter" && etiketEkle()} placeholder="Yeni uzmanlık" maxLength={30} />
            <button type="button" onClick={etiketEkle} disabled={!yeniE.trim()} className="shrink-0 rounded-xl bg-[#1f1f22] px-3.5 text-[0.875rem] font-bold disabled:opacity-40">
              + Ekle
            </button>
          </div>
        </Alan>
        <Alan ad="Hangi sporcular">
          <div className="flex flex-wrap gap-1.5">
            <Hap on={!k.sporlar.length} onClick={() => set({ sporlar: [] })}>
              Hepsi
            </Hap>
            {SPORLAR.map(([id, ad]) => (
              <Hap key={id} on={k.sporlar.includes(id)} onClick={() => ac("sporlar", id)}>
                {ad}
              </Hap>
            ))}
          </div>
        </Alan>
        <Alan ad="Yaş">
          <div className="flex flex-wrap gap-1.5">
            {YASLAR.map(([id, ad]) => (
              <Hap key={id} on={k.yas.includes(id)} onClick={() => ac("yas", id)}>
                {ad}
              </Hap>
            ))}
          </div>
        </Alan>
        <div className="grid grid-cols-2 gap-3">
          <Alan ad="Şehir">
            <input className={inputCls} value={k.sehir} onChange={(e) => set({ sehir: e.target.value })} placeholder="İzmir" maxLength={40} />
          </Alan>
          <Alan ad="En çok sporcu">
            <input className={inputCls} value={k.kapasite} onChange={(e) => set({ kapasite: e.target.value.replace(/\D/g, "").slice(0, 3) })} inputMode="numeric" placeholder="10" />
          </Alan>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Hap on={k.online} onClick={() => set({ online: !k.online })}>
            Online da çalışır
          </Hap>
          <Hap on={k.durum === "pasif"} onClick={() => set({ durum: k.durum === "pasif" ? "aktif" : "pasif" })}>
            Pasif
          </Hap>
        </div>
        <Alan ad="Telefon">
          <input className={inputCls} value={k.tel} onChange={(e) => set({ tel: e.target.value })} type="tel" inputMode="tel" placeholder="5xx xxx xx xx" maxLength={30} />
        </Alan>
        <Alan ad="E-posta">
          <input className={inputCls} value={k.mail} onChange={(e) => set({ mail: e.target.value })} type="email" inputMode="email" autoCapitalize="off" placeholder="ornek@mail.com" maxLength={80} />
        </Alan>
        <Alan ad="Not">
          <textarea className={`${inputCls} h-20 py-2.5`} value={k.not} onChange={(e) => set({ not: e.target.value })} maxLength={300} />
        </Alan>
      </div>
    </Sheet>
  );
}

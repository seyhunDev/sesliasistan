"use client";

import { buttonClass } from "@/components/ui/buttonClass";
import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, documentId, getCountFromServer, getDocs, limit, orderBy, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { BackButton } from "@/components/ui/BackButton";
import { ListHead } from "@/components/ui/Row";
import { LoadFail } from "@/components/ui/LoadFail";
import { ListLoading } from "@/components/ui/Loader";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { liveHead } from "@/features/liveScreen/fonts";
import { Row } from "@/features/settings/ui";
import { telGoster } from "@/lib/basvuru";
import { gunEkle, gunOf, gunlukKisi, sonGunlerde, sureYaz } from "@/lib/kullanim";
import { Hatalar } from "./Hatalar";
import { VELORA_ADMIN } from "@/lib/sharedRace";

// Ayarlar › Admin (yalnız ana hesap; Seyhun 2026-11-26 "yap", örnek project-files/admin-sayfasi/ornek.html):
// Başvurular (tanıtımdaki "Velora'ya katıl" formu, /api/basvuru) ve Kullanım (izin veren hesaplar; lib/kullanim.js).
// Okuma az: başvurular en çok 100, kullanım hesap başına tek belge; kişinin gün gün ayrıntısı yalnız dokununca (son 14 gün).

const DURUM = [
  ["yeni", "Yeni"],
  ["arandi", "Arandı"],
  ["acildi", "Hesap açıldı"],
];
const tarih = (ts) => {
  const d = ts?.toDate?.();
  if (!d) return "";
  const g = gunOf(d.getTime());
  const bugun = gunOf();
  if (g === bugun) return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  if (g === gunEkle(bugun, -1)) return "Dün";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
};
const once = (ts) => {
  const ms = ts?.toMillis?.();
  if (!ms) return "";
  const dk = Math.round((Date.now() - ms) / 60e3);
  if (dk < 10) return "Şimdi";
  if (dk < 60) return `${dk} dk önce`;
  if (dk < 24 * 60) return `${Math.round(dk / 60)} sa önce`;
  return tarih(ts);
};

function useAdmin(org) {
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState(false);
  const yukle = useCallback(async () => {
    try {
      const [b, k] = await Promise.all([
        getDocs(query(collection(db, "orgs", org, "basvurular"), orderBy("at", "desc"), limit(100))),
        getDocs(collection(db, "orgs", org, "kullanim")),
      ]);
      setHata(false);
      setVeri({ basvuru: b.docs.map((d) => ({ id: d.id, ...d.data() })), hesap: k.docs.map((d) => ({ id: d.id, ...d.data() })) });
    } catch (e) {
      console.warn("[admin]", e?.code || e?.message);
      setHata(true);
    }
  }, [org]);
  useEffect(() => {
    Promise.resolve().then(yukle);
  }, [yukle]);
  return { veri, setVeri, hata, yukle };
}

export function AdminPage() {
  const { profile } = useAuth();
  const org = profile?.orgId;
  const { veri, setVeri, hata, yukle } = useAdmin(org);
  const [sek, setSek] = useState("b");
  const bugun = gunOf();

  if (profile?.role !== "owner" || String(profile?.email || "").toLowerCase() !== VELORA_ADMIN) return null;
  const yeni = veri?.basvuru.filter((b) => b.durum === "yeni").length || 0;
  const izinli = veri?.hesap.filter((h) => h.izin) || [];
  return (
    <main className={`sahne-pg ${liveHead.variable} wide mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]`}>
      <section className="pb-5 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <header className="flex items-center gap-2.5">
          <BackButton href="/settings" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="sahne-t truncate text-[2rem]">Admin</h1>
            <p className="mt-1 truncate text-[0.8125rem] text-mut">Başvurular, kullanım, hatalar</p>
          </div>
        </header>
      </section>
      {hata ? (
        <LoadFail onRetry={yukle} />
      ) : !veri ? (
        <ListLoading height="20rem" />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            <Kutu ad="Yeni başvuru" n={yeni} acc />
            <Kutu ad="Bugün giren" n={izinli.filter((h) => sonGunlerde(h, bugun, 1)).length} />
            <Kutu ad="7 gün" n={izinli.filter((h) => sonGunlerde(h, bugun, 7)).length} />
          </div>
          <div className="divide-y divide-line overflow-hidden rounded-[1.25rem] border border-line bg-card">
            <UzmanlarRow org={org} />
            {String(profile?.email || "").toLowerCase() === VELORA_ADMIN && <Row title="Paketler" href="/settings/admin/paketler" />}
            {String(profile?.email || "").toLowerCase() === VELORA_ADMIN && <Row title="Kulüpler" href="/settings/admin/kulupler" />}
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-2xl border border-line bg-card p-1" role="tablist">
            {[
              ["b", "Başvurular"],
              ["k", "Kullanım"],
              ["h", "Hatalar"],
            ].map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={sek === k} onClick={() => setSek(k)} className={`min-w-0 truncate rounded-xl px-0.5 py-2 text-[0.8125rem] font-semibold transition ${sek === k ? "bg-acc text-[#111]" : "text-mut"}`}>
                {l}
              </button>
            ))}
          </div>
          {sek === "b" ? (
            <Basvurular org={org} list={veri.basvuru} setList={(f) => setVeri((v) => ({ ...v, basvuru: f(v.basvuru) }))} />
          ) : sek === "h" ? (
            <Hatalar org={org} />
          ) : (
            <Kullanim org={org} hesaplar={veri.hesap} bugun={bugun} />
          )}
        </div>
      )}
    </main>
  );
}

function Kutu({ ad, n, acc }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-card px-3 py-2.5">
      <p className="truncate text-[0.75rem] text-mut">{ad}</p>
      <p className={`sahne-t mt-1 text-[2rem] tabular-nums ${acc && n ? "text-acc" : ""}`}>{n}</p>
    </div>
  );
}

const Liste = ({ children }) => <div className="divide-y divide-line overflow-hidden rounded-[1.25rem] border border-line bg-card">{children}</div>;
const Bos = ({ children }) => <p className="rounded-[1.25rem] border border-line bg-card px-4 py-6 text-center text-[0.9375rem] text-mut">{children}</p>;
const Bilgi = ({ ad, children }) => (
  <div className="flex justify-between gap-3 text-[0.875rem]">
    <span className="text-mut">{ad}</span>
    <span className="min-w-0 select-all truncate text-right font-medium tabular-nums">{children}</span>
  </div>
);
const Dugme = ({ href, onClick, main, children }) => {
  const c = buttonClass({ variant: main ? "primary" : "secondary", size: "sm", full: false });
  return href ? (
    <a href={href} className={c}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={c}>
      {children}
    </button>
  );
};

function Basvurular({ org, list, setList }) {
  const [acik, setAcik] = useState(list.find((b) => b.durum === "yeni")?.id || "");
  const ask = useConfirm();
  const toast = useToast();
  if (!list.length) return <Bos>Henüz başvuru yok. Tanıtımdaki &quot;Velora&apos;ya katıl&quot; formundan gelenler burada görünür.</Bos>;
  const durumYaz = async (b, durum) => {
    setList((l) => l.map((x) => (x.id === b.id ? { ...x, durum } : x)));
    await updateDoc(doc(db, "orgs", org, "basvurular", b.id), { durum }).catch(() => toast?.("Kaydedilemedi"));
  };
  const sil = (b) =>
    ask({
      title: `${b.ad} silinsin mi?`,
      text: "Başvuru kalıcı olarak silinir.",
      run: async () => {
        await deleteDoc(doc(db, "orgs", org, "basvurular", b.id));
        setList((l) => l.filter((x) => x.id !== b.id));
      },
    });
  return (
    <Liste>
      {list.map((b) => (
        <div key={b.id}>
          <button type="button" onClick={() => setAcik(acik === b.id ? "" : b.id)} className="flex min-h-[3.25rem] w-full items-center gap-2.5 px-4 py-2 text-left transition active:bg-bg">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{b.ad}</span>
              <span className="block truncate text-[0.8125rem] text-mut">{[b.rol, b.kulup].filter(Boolean).join(" · ")}</span>
            </span>
            {b.durum === "yeni" ? (
              <span className="rounded-full bg-acc px-2 py-0.5 text-[0.6875rem] font-bold text-[#111]">Yeni</span>
            ) : b.durum === "acildi" ? (
              <span className="rounded-full bg-accbg px-2 py-0.5 text-[0.6875rem] font-bold text-acc">Açıldı</span>
            ) : null}
            <span className="w-12 shrink-0 text-right text-[0.8125rem] tabular-nums text-mut">{tarih(b.at)}</span>
          </button>
          {acik === b.id && (
            <div className="space-y-2.5 border-t border-dashed border-line px-4 pb-4 pt-3">
              <Bilgi ad="Telefon">{telGoster(b.tel)}</Bilgi>
              <Bilgi ad="E-posta">{b.mail}</Bilgi>
              <Bilgi ad="Geldiği yer">{[b.kaynak, b.cihaz].filter(Boolean).join(" · ")}</Bilgi>
              <div className="flex flex-wrap gap-2 pt-1">
                <Dugme href={`tel:${b.tel}`} main>
                  Ara
                </Dugme>
                <Dugme href={`mailto:${b.mail}`}>Mail</Dugme>
                <Dugme href="/staff">Kişilere ekle</Dugme>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {DURUM.map(([k, l]) => (
                  <button key={k} type="button" aria-pressed={b.durum === k} onClick={() => durumYaz(b, k)} className={`rounded-full border px-3 py-1 text-[0.8125rem] font-semibold ${b.durum === k ? "border-acc bg-acc text-[#111]" : "border-line text-mut"}`}>
                    {l}
                  </button>
                ))}
                <button type="button" onClick={() => sil(b)} className="ml-auto px-2 py-1 text-[0.8125rem] font-semibold text-rec">
                  Sil
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </Liste>
  );
}

function Grafik({ gunler }) {
  const max = Math.max(1, ...gunler.map((g) => g.kisi));
  const w = 280 / gunler.length;
  const son = gunler[gunler.length - 1];
  const yaz = (g) => new Date(`${g}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  return (
    <div className="rounded-[1.25rem] border border-line bg-card px-4 pb-2.5 pt-3">
      <div className="flex justify-between text-[0.75rem] text-mut">
        <span>Giren kişi · son {gunler.length} gün</span>
        <span>bugün {son.kisi}</span>
      </div>
      <svg viewBox="0 0 280 70" preserveAspectRatio="none" className="mt-2 block h-[4.2rem] w-full" role="img" aria-label={`Son ${gunler.length} günde her gün giren kişi sayısı`}>
        <line x1="0" y1="69.5" x2="280" y2="69.5" stroke="var(--line)" />
        {gunler.map((g, i) => {
          const h = (g.kisi / max) * 62;
          return <rect key={g.gun} x={i * w + 3} y={69 - h} width={w - 6} height={h} rx="2" fill={i === gunler.length - 1 ? "var(--acc)" : "#3a3a40"} />;
        })}
      </svg>
      <div className="flex justify-between text-[0.6875rem] tabular-nums text-mut">
        <span>{yaz(gunler[0].gun)}</span>
        <span>{yaz(son.gun)}</span>
      </div>
    </div>
  );
}

function Kullanim({ org, hesaplar, bugun }) {
  const [acik, setAcik] = useState("");
  const gunler = useMemo(() => gunlukKisi(hesaplar.filter((h) => h.izin), bugun, 14), [hesaplar, bugun]);
  const sirali = useMemo(
    () => [...hesaplar].sort((a, b) => (b.izin ? 1 : 0) - (a.izin ? 1 : 0) || (b.son?.toMillis?.() || 0) - (a.son?.toMillis?.() || 0)),
    [hesaplar],
  );
  if (!hesaplar.length) return <Bos>Henüz kayıt yok. Kişiler izin sorusuna &quot;Kabul&quot; dedikçe burada görünür.</Bos>;
  return (
    <div className="space-y-5">
      <Grafik gunler={gunler} />
      <section>
        <ListHead title="Kişiler" count={hesaplar.filter((h) => h.izin).length} />
        <Liste>
          {sirali.map((h) =>
            !h.izin ? (
              <div key={h.id} className="flex min-h-[3.25rem] items-center gap-2.5 px-4 py-2">
                <span className="size-2 shrink-0 rounded-full bg-[#52525b]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{h.ad || "Kişi"}</span>
                  <span className="block truncate text-[0.8125rem] text-mut">{h.tur}</span>
                </span>
                <span className="rounded-full bg-[#1f1f22] px-2 py-0.5 text-[0.6875rem] font-bold text-mut">İzin yok</span>
              </div>
            ) : (
              <Kisi key={h.id} org={org} h={h} bugun={bugun} acik={acik === h.id} onAc={() => setAcik(acik === h.id ? "" : h.id)} />
            ),
          )}
        </Liste>
      </section>
    </div>
  );
}

function Kisi({ org, h, bugun, acik, onAc }) {
  const s = once(h.son);
  return (
    <div>
      <button type="button" onClick={onAc} className="flex min-h-[3.25rem] w-full items-center gap-2.5 px-4 py-2 text-left transition active:bg-bg">
        <span className={`size-2 shrink-0 rounded-full ${s === "Şimdi" ? "bg-[#4ade80]" : "bg-[#52525b]"}`} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{h.ad || "Kişi"}</span>
          <span className="block truncate text-[0.8125rem] text-mut">{[h.tur, `bugün ${sureYaz(h.gunler?.[bugun] || 0)}`].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="shrink-0 text-right text-[0.8125rem] tabular-nums text-mut">{s}</span>
      </button>
      {acik && <KisiAyrinti org={org} h={h} />}
    </div>
  );
}

function KisiAyrinti({ org, h }) {
  const [gunler, setGunler] = useState(null);
  useEffect(() => {
    getDocs(query(collection(db, "orgs", org, "kullanim", h.id, "gun"), orderBy(documentId(), "desc"), limit(14)))
      .then((s) => setGunler(s.docs.map((d) => ({ gun: d.id, ...d.data() }))))
      .catch(() => setGunler([]));
  }, [org, h.id]);
  const sayfalar = useMemo(() => {
    const t = {};
    for (const g of (gunler || []).slice(0, 7)) for (const [k, v] of Object.entries(g.sayfa || {})) t[k] = (t[k] || 0) + v;
    return Object.entries(t)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [gunler]);
  const oturumlar = useMemo(
    () =>
      (gunler || [])
        .flatMap((g) => Object.entries(g.oturum || {}).map(([a, b]) => [Number(a), Number(b)]))
        .filter(([a, b]) => b - a >= 30e3)
        .sort((x, y) => y[0] - x[0])
        .slice(0, 12),
    [gunler],
  );
  const mx = sayfalar[0]?.[1] || 1;
  const saat = (ms) => new Date(ms).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const gunAd = (ms) => {
    const g = gunOf(ms);
    const b = gunOf();
    return g === b ? "Bugün" : g === gunEkle(b, -1) ? "Dün" : new Date(ms).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  };
  return (
    <div className="space-y-3 border-t border-dashed border-line px-4 pb-4 pt-3">
      <Bilgi ad="Cihaz">{h.cihaz || "–"}</Bilgi>
      <Bilgi ad="Sürüm">{h.surum || "–"}</Bilgi>
      {!gunler ? (
        <p className="text-[0.8125rem] text-mut">Yükleniyor…</p>
      ) : (
        <>
          <div>
            <p className="mb-1.5 text-[0.6875rem] font-semibold tracking-[0.06em] text-mut">SAYFALAR · 7 GÜN</p>
            <div className="space-y-1.5">
              {sayfalar.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[6rem_1fr_3.5rem] items-center gap-2 text-[0.8125rem]">
                  <span className="truncate">{k}</span>
                  <span className="block h-[0.45rem] rounded-full bg-acc" style={{ width: `${Math.max(4, (v / mx) * 100)}%` }} />
                  <span className="text-right tabular-nums text-mut">{sureYaz(v)}</span>
                </div>
              ))}
              {!sayfalar.length && <p className="text-[0.8125rem] text-mut">Bu hafta kayıt yok.</p>}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[0.6875rem] font-semibold tracking-[0.06em] text-mut">GİRİŞ · ÇIKIŞ</p>
            <div className="space-y-1 text-[0.8125rem] tabular-nums">
              {oturumlar.map(([a, b]) => (
                <div key={a} className="flex justify-between gap-2">
                  <span>
                    {gunAd(a)} {saat(a)} – {saat(b)}
                  </span>
                  <span className="text-mut">{sureYaz((b - a) / 1000)}</span>
                </div>
              ))}
              {!oturumlar.length && <p className="text-mut">Kayıt yok.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Ayarlar'daki satır (yalnız ana hesap): yanında yeni başvuru sayısı (tek sayım sorgusu)
// Admin › Uzman antrenörler: ayrı sayfa (Seyhun 2026-11-27 "Admin işlemleri ayrı, uzmanlar ayrı"); sağda uzman bekleyen sporcu sayısı
function UzmanlarRow({ org }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!org) return;
    getCountFromServer(query(collection(db, "orgs", org, "uzmanIstekleri"), where("durum", "==", "bekliyor")))
      .then((s) => setN(s.data().count))
      .catch(() => {});
  }, [org]);
  return (
    <Row
      title="Uzman antrenörler"
      href="/settings/admin/uzmanlar"
      right={n ? <span className="rounded-full bg-acc px-2 py-0.5 text-[0.6875rem] font-bold text-[#111]">{n} bekliyor</span> : null}
    />
  );
}

export function AdminRow({ org }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!org) return;
    getCountFromServer(query(collection(db, "orgs", org, "basvurular"), where("durum", "==", "yeni")))
      .then((s) => setN(s.data().count))
      .catch(() => {});
  }, [org]);
  return (
    <Row
      title="Admin"
      href="/settings/admin"
      right={n ? <span className="rounded-full bg-acc px-2 py-0.5 text-[0.6875rem] font-bold text-[#111]">{n} yeni</span> : null}
    />
  );
}

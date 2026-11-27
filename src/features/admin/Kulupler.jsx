"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AddButton } from "@/components/ui/AddButton";
import { BackButton } from "@/components/ui/BackButton";
import { LoadFail } from "@/components/ui/LoadFail";
import { ListLoading } from "@/components/ui/Loader";
import { Sheet, SheetActions, SheetTone } from "@/components/ui/Sheet";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { liveHead } from "@/features/liveScreen/fonts";
import { CLUB_FIELDS, clubIdOf, clubSuggestions, parseClubImport, searchClubs } from "@/lib/club";
import { VELORA_ADMIN } from "@/lib/sharedRace";
import { loadSharedAll, loadSharedSheets } from "@/features/athletes/sharedRaces";
import { loadClubs, removeClub, saveClub, seedDikili } from "@/features/clubs/clubs";

// Admin › Kulüpler (yalnız Velora ana hesabı; Seyhun 2026-11-27): resmi kulüp listesi. Kullanıcılar kulübünü yalnız buradan
// seçer (serbest ad yok). "Yarış sonuçlarından bul": ortak yarışların sonuç listelerindeki (TYF) kulüp adlarından, listede
// olmayanlar; dokununca bilgileri gözden geçirip eklenir. Dikili kaydı yoksa ilk açılışta eklenir.

const inputCls = "h-11 w-full rounded-xl border border-line bg-[#1f1f22] px-3.5 text-[0.9375rem] text-fg outline-none placeholder:text-mut/70 focus:border-acc";
const Liste = ({ children }) => <div className="divide-y divide-line overflow-hidden rounded-[1.25rem] border border-line bg-card">{children}</div>;

// Liste (Dikili kaydı yoksa önce eklenir)
async function tumu() {
  await seedDikili().catch(() => {});
  return loadClubs({ fresh: true });
}

export function KuluplerSayfasi() {
  const { profile, user } = useAuth();
  const email = String(user?.email || profile?.email || "").toLowerCase();
  if (profile?.role !== "owner" || email !== VELORA_ADMIN) return null;
  return (
    <main className={`sahne-pg ${liveHead.variable} wide mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]`}>
      <SheetTone.Provider value="sahne">
        <Kulupler />
      </SheetTone.Provider>
    </main>
  );
}

function Kulupler() {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [hata, setHata] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null); // null | { id?, ...alanlar }
  const [oneri, setOneri] = useState(null); // null | "yukleniyor" | [{ name, n }]
  const [ice, setIce] = useState(false); // "Listeyi içeri al" penceresi
  const [topluBekle, setTopluBekle] = useState(false);

  // Toplu kayıt: listede olan kulübün adı ezilmez, yalnız federasyon no ve boş il/ilçe dolar
  const topluKaydet = async (rows) => {
    setTopluBekle(true);
    let n = 0;
    try {
      for (const r of rows) {
        const eski = (list || []).find((c) => c.id === r.id);
        const data = eski
          ? { ...eski, tfId: r.tfId || eski.tfId || "", city: eski.city || r.city || "", district: eski.district || r.district || "" }
          : { ...r, tyfName: r.tyfName || r.name.toLocaleUpperCase("tr-TR") };
        await saveClub(r.id, data);
        n += 1;
      }
      toast(`${n} kulüp kaydedildi`);
    } catch {
      toast(n ? `${n} kulüp kaydedildi, kalanı kaydedilemedi` : "Kaydedilemedi");
    } finally {
      setTopluBekle(false);
      setList(await loadClubs({ fresh: true }).catch(() => list));
    }
  };

  const yukle = useCallback(() => tumu().then(setList, () => setHata(true)), []);
  useEffect(() => {
    tumu().then(setList, () => setHata(true));
  }, []);

  const shown = useMemo(() => searchClubs(list || [], q), [list, q]);

  const bul = async () => {
    setOneri("yukleniyor");
    try {
      const races = await loadSharedAll();
      const sheets = [];
      for (const r of races.filter((x) => (x.sheets || []).length)) sheets.push(...(await loadSharedSheets(r.id).catch(() => [])));
      setOneri(clubSuggestions(sheets, list || []));
    } catch {
      setOneri(null);
      toast("Yarış sonuçları okunamadı");
    }
  };

  const ust = (
    <section className="pb-5 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <header className="flex items-center gap-2.5">
        <BackButton href="/settings/admin" />
        <div className="min-w-0 flex-1 leading-tight">
          <h1 className="sahne-t truncate text-[2rem]">Kulüpler</h1>
          <p className="mt-1 truncate text-[0.8125rem] text-mut">{list ? `${list.length} resmi kulüp` : "Resmi kulüp listesi"}</p>
        </div>
      </header>
    </section>
  );
  if (hata)
    return (
      <>
        {ust}
        <LoadFail onRetry={() => (setHata(false), yukle())} />
      </>
    );
  if (!list)
    return (
      <>
        {ust}
        <ListLoading height="16rem" />
      </>
    );
  return (
    <>
      {ust}
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <input id="kulup-admin-ara" type="search" className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara" autoComplete="off" />
          <AddButton onClick={() => setForm({})} label="Kulüp ekle">
            Kulüp
          </AddButton>
        </div>
        <Liste>
          {shown.map((c) => (
            <button key={c.id} type="button" onClick={() => setForm(c)} className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2 text-left active:bg-white/5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9375rem] font-medium">{c.name}</span>
                <span className="block truncate text-[0.8125rem] text-mut">{[c.district, c.city].filter(Boolean).join(", ") || "İl yok"}</span>
              </span>
              <span aria-hidden="true" className="text-mut">›</span>
            </button>
          ))}
          {!shown.length && <p className="px-4 py-4 text-[0.9375rem] text-mut">{list.length ? "Bulunamadı." : "Liste boş."}</p>}
        </Liste>

        <div className="space-y-2">
          <p className="px-1 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-mut">Liste ekle</p>
          {oneri === null ? (
            <button type="button" onClick={bul} className="h-11 w-full rounded-xl border border-line text-[0.9375rem] font-semibold text-acc active:scale-[0.98]">
              Listede olmayan kulüpleri bul
            </button>
          ) : oneri === "yukleniyor" ? (
            <ListLoading height="8rem" />
          ) : !oneri.length ? (
            <p className="px-1 text-[0.9375rem] text-mut">Sonuçlardaki bütün kulüpler listede.</p>
          ) : (
            <>
            <Liste>
              {oneri.map((o) => (
                <button key={o.name} type="button" onClick={() => setForm({ name: o.name, tyfName: o.name.toLocaleUpperCase("tr-TR") })} className="flex min-h-[3rem] w-full items-center gap-3 px-4 py-2 text-left active:bg-white/5">
                  <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{o.name}</span>
                  <span className="shrink-0 text-[0.8125rem] tabular-nums text-mut">{o.n} satır</span>
                  <span className="shrink-0 text-[0.8125rem] font-semibold text-acc">Ekle</span>
                </button>
              ))}
            </Liste>
            <button
              type="button"
              disabled={topluBekle}
              onClick={async () => {
                await topluKaydet(oneri.map((o) => ({ id: clubIdOf(o.name), name: o.name })).filter((r) => r.id));
                setOneri(null);
              }}
              className="h-11 w-full rounded-xl border border-line text-[0.9375rem] font-semibold text-acc active:scale-[0.98] disabled:opacity-60"
            >
              {topluBekle ? "Ekleniyor…" : `Hepsini ekle (${oneri.length})`}
            </button>
            </>
          )}
          <button type="button" onClick={() => setIce(true)} className="h-11 w-full rounded-xl border border-line text-[0.9375rem] font-semibold text-acc active:scale-[0.98]">
            Listeyi içeri al
          </button>
        </div>
      </div>
      <IceriAl open={ice} list={list} kapat={() => setIce(false)} bekle={topluBekle} al={async (rows) => (await topluKaydet(rows), setIce(false))} />
      <KulupForm
        key={form ? form.id || form.name || "yeni" : "kapali"}
        k={form}
        list={list}
        kapat={() => setForm(null)}
        bitti={async (adi) => {
          setForm(null);
          if (Array.isArray(oneri) && adi) setOneri(oneri.filter((o) => o.name !== adi));
          setList(await loadClubs({ fresh: true }).catch(() => list));
        }}
      />
    </>
  );
}

function KulupForm({ k, list, kapat, bitti }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [f, setF] = useState(() => Object.fromEntries(CLUB_FIELDS.map(([x]) => [x, k?.[x] || ""])));
  const [bekle, setBekle] = useState(false);
  const yeni = !k?.id;

  const kaydet = async () => {
    const name = String(f.name || "").trim();
    if (!name) return toast("Kulüp adı yaz");
    const id = k?.id || clubIdOf(name);
    if (!id) return toast("Kulüp adı geçersiz");
    if (yeni && list.some((c) => c.id === id)) return toast("Bu kulüp listede var");
    setBekle(true);
    try {
      await saveClub(id, f);
      toast(yeni ? "Kulüp eklendi" : "Kaydedildi");
      await bitti(k?.name && yeni ? k.name : "");
    } catch {
      toast("Kaydedilemedi");
    } finally {
      setBekle(false);
    }
  };
  const sil = () =>
    confirm({
      title: `${k.name} silinsin mi?`,
      text: "Bu kulübü seçmiş kullanıcılar kulüpsüz kalır.",
      yes: "Sil",
      run: async () => {
        try {
          await removeClub(k.id);
        } catch (e) {
          toast("Silinemedi");
          throw e;
        }
        toast("Silindi");
        await bitti("");
      },
    });

  return (
    <Sheet
      open={!!k}
      onClose={kapat}
      title={yeni ? "Yeni kulüp" : "Kulübü düzenle"}
      footer={<SheetActions onCancel={kapat} onDelete={!yeni ? sil : undefined} onYes={kaydet} yes={bekle ? "Kaydediliyor…" : "Kaydet"} disabled={bekle} />}
    >
      <div className="space-y-4 pb-2">
        {CLUB_FIELDS.map(([x, ad, type]) => (
          <div key={x} className="space-y-1.5">
            <label htmlFor={`kulup-${x}`} className="block text-[0.8125rem] font-medium text-mut">
              {ad}
            </label>
            <input
              id={`kulup-${x}`}
              className={inputCls}
              type={type || "text"}
              inputMode={type === "tel" ? "tel" : undefined}
              value={f[x] || ""}
              onChange={(e) => setF((v) => ({ ...v, [x]: e.target.value }))}
              autoComplete="off"
              maxLength={x === "address" ? 200 : x === "logo" ? 500 : 120}
            />
          </div>
        ))}
        {yeni && f.name && <p className="text-[0.8125rem] text-mut">Kimlik: {clubIdOf(f.name)}</p>}
      </div>
    </Sheet>
  );
}

// Federasyonun resmi listesi (Seyhun 2026-11-27: TYF kulüp numaralarıyla): satır satır "no; ad; il; ilçe" ya da JSON yapıştırılır
function IceriAl({ open, list, kapat, bekle, al }) {
  const [t, setT] = useState("");
  const rows = useMemo(() => parseClubImport(t, list || []), [t, list]);
  const yeni = rows.filter((r) => !(list || []).some((c) => c.id === r.id)).length;
  return (
    <Sheet
      open={open}
      onClose={kapat}
      title="Listeyi içeri al"
      footer={<SheetActions onCancel={kapat} onYes={() => rows.length && al(rows)} yes={bekle ? "Kaydediliyor…" : `İçeri al (${rows.length})`} disabled={bekle || !rows.length} />}
    >
      <div className="space-y-2 pb-2">
        <label htmlFor="kulup-ice" className="block text-[0.8125rem] font-medium text-mut">
          Her satıra bir kulüp: no; ad; il; ilçe
        </label>
        <textarea id="kulup-ice" value={t} onChange={(e) => setT(e.target.value)} rows={8} className="w-full rounded-xl border border-line bg-[#1f1f22] px-3.5 py-3 text-[0.9375rem] text-fg outline-none focus:border-acc" />
        {!!rows.length && (
          <p className="text-[0.8125rem] text-mut">
            {yeni} yeni, {rows.length - yeni} listede olan (yalnız no ve boş il/ilçe dolar)
          </p>
        )}
      </div>
    </Sheet>
  );
}

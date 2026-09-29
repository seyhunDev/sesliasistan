"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Screen } from "@/components/ui/Screen";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { compressImage, thumbFromDataUrl } from "@/lib/image";
import { appAllowed, isMobile, mediaSupported, offMessage } from "@/lib/permissions";
import { CAT, CATS, PAYS, TLk, VATS, calcTotals, confAvg, lowConf, parseQty, parseTL, toInput } from "@/lib/receipts";
import { todayStr } from "@/lib/utils/format";
import { readReceipt } from "@/services/receiptService";
import { CameraView } from "./CameraView";

let seq = 0;
const nid = () => `i${Date.now()}_${seq++}`;
const newItem = (i = {}) => ({
  key: nid(),
  n: i.n || "",
  q: i.q != null ? String(i.q).replace(".", ",") : "1",
  u: i.u != null ? toInput(i.u) : "",
  r: i.r ?? 20,
});
const emptyForm = () => ({
  merchant: "", taxId: "", address: "", docType: "fis", docNo: "", date: todayStr(), time: "",
  items: [newItem()], declared: "", pay: "Kart", cat: "Diğer", note: "",
});
const fromDraft = (d) => ({
  merchant: d.merchant || "",
  taxId: d.taxId || "",
  address: d.address || "",
  docType: d.docType || "fis",
  docNo: d.docNo || "",
  date: d.date || todayStr(),
  time: d.time || "",
  items: d.items?.length ? d.items.map(newItem) : [newItem()],
  declared: d.declared ? toInput(d.declared) : "",
  pay: d.pay || "Kart",
  cat: d.cat || "Diğer",
  note: d.note || "",
});
// Formdaki metinleri kayda uygun sayılara çevirir (tutarlar kuruş)
const toDraft = (f) => ({
  ...f,
  merchant: f.merchant.trim(),
  items: f.items
    .filter((i) => i.n.trim() || i.u.trim())
    .map((i) => ({ n: i.n.trim(), q: parseQty(i.q), u: parseTL(i.u), r: Number(i.r) })),
  declared: f.declared.trim() ? parseTL(f.declared) : null,
});

const inp = "h-11 w-full min-w-0 rounded-xl border bg-card px-3 text-base text-fg outline-none transition focus:border-acc";
const ok = "border-line";
const warn = "border-amber-500 bg-amber-50";

function L({ label, children, className = "" }) {
  return (
    <label className={`block text-xs font-medium text-mut ${className}`}>
      {label}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function Seg({ value, options, onChange }) {
  return (
    <div className="flex rounded-xl bg-bg p-[3px]">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`flex-1 rounded-[10px] py-2 text-sm font-semibold transition ${value === v ? "bg-card text-fg shadow-sm" : "text-mut"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function ReceiptSheet({ open, onClose, seed }) {
  const toast = useToast();
  const router = useRouter();
  const path = usePathname();
  const { profile } = useAuth();
  const { receipts, saveReceipt, updateReceipt, deleteRecord, loadReceiptImage } = useData();
  const editId = seed?.edit || null;

  const [stage, setStage] = useState("pick"); // pick | camera | reading | form
  const [form, setForm] = useState(emptyForm);
  const [conf, setConf] = useState(null);
  const [image, setImage] = useState(null); // gösterilen fotoğraf (dataURL)
  const [imageDirty, setImageDirty] = useState(false);
  const [aiImage, setAiImage] = useState(null); // tekrar okuma için
  const [error, setError] = useState("");
  const [secs, setSecs] = useState(0);
  const [more, setMore] = useState(false);
  const [armed, setArmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [camError, setCamError] = useState("");
  const ctrl = useRef(null);
  const camBack = useRef("pick"); // canlı kameradan vazgeçince dönülecek adım
  const camRef = useRef(null);
  const galRef = useRef(null);

  // Her açılışta sıfırla
  useEffect(() => {
    if (!open) {
      ctrl.current?.abort();
      return;
    }
    setError("");
    setCamError("");
    setArmed(false);
    setSaving(false);
    setImageDirty(false);
    setAiImage(null);
    setMore(false);
    if (editId) {
      const rec = receipts.find((r) => r.id === editId);
      setForm(rec ? fromDraft(rec) : emptyForm());
      setConf(rec?.conf || null);
      setImage(null);
      setStage("form");
      if (rec?.hasImage) loadReceiptImage(editId).then((img) => img && setImage(img));
      return;
    }
    setForm(emptyForm());
    setConf(null);
    setImage(null);
    camBack.current = "pick";
    if (seed?.camera && !appAllowed("camera")) setCamError(offMessage("camera"));
    else if (seed?.camera && !mediaSupported()) setCamError("Bu tarayıcıda kamera doğrudan açılamıyor. Aşağıdan fotoğraf çekebilirsin.");
    // seed.camera: "fiş yükle" gibi komutlarla gelindi, kamera hemen açılır
    setStage(seed?.manual ? "form" : seed?.camera && mediaSupported() && appAllowed("camera") ? "camera" : "pick");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seed?.id]);

  // Okuma sırasında geçen saniye
  useEffect(() => {
    if (stage !== "reading" || error) return;
    setSecs(0);
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [stage, error]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setItem = (key, patch) => setForm((f) => ({ ...f, items: f.items.map((i) => (i.key === key ? { ...i, ...patch } : i)) }));
  const removeItem = (key) => setForm((f) => ({ ...f, items: f.items.length > 1 ? f.items.filter((i) => i.key !== key) : [newItem()] }));

  async function read(img) {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setError("");
    setStage("reading");
    try {
      const r = await readReceipt({ image: img.base64, mimeType: img.mimeType }, c.signal);
      if (c.signal.aborted) return;
      setForm(fromDraft(r.draft));
      setConf(r.draft.conf || null);
      setMore(false);
      setStage("form");
      navigator.vibrate?.([8, 30, 8]);
    } catch (e) {
      if (e.name === "AbortError") return;
      setError(e.message || "Fiş okunamadı");
    }
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) takeFile(file);
  }

  // Telefonda sistem kamerası (daha iyi odak), bilgisayarda uygulama içi kamera
  function takePhoto() {
    setCamError("");
    if (!appAllowed("camera")) return setCamError(offMessage("camera"));
    if (!isMobile() && mediaSupported()) {
      camBack.current = stage === "camera" ? camBack.current : stage === "reading" ? (editId ? "form" : "pick") : stage;
      setError("");
      setStage("camera");
    } else camRef.current?.click();
  }

  function onCamError(e) {
    setCamError(e.message || "Kamera açılamadı");
    setStage(camBack.current === "form" ? "form" : "pick");
  }

  async function takeFile(file) {
    setCamError("");
    setStage("reading");
    setError("");
    try {
      const img = await compressImage(file);
      setImage(img.dataUrl);
      setImageDirty(true);
      setAiImage(img);
      await read(img);
    } catch (err) {
      setError(err.message || "Fotoğraf açılamadı");
    }
  }

  const cancelRead = () => {
    ctrl.current?.abort();
    setStage(editId ? "form" : "pick");
    setError("");
  };

  // Canlı toplamlar
  const live = toDraft(form);
  const totals = calcTotals(live.items.map((i) => ({ ...i, u: Number.isNaN(i.u) ? 0 : i.u })));
  const declared = live.declared;
  const hasDeclared = declared > 0;
  const diff = hasDeclared ? declared - totals.gross : 0;
  const matched = hasDeclared && Math.abs(diff) <= 5;
  const avg = confAvg(conf);
  const lowAny = conf && ["merchant", "date", "total", "vat", "items"].some((k) => lowConf(conf, k));

  async function save() {
    const d = toDraft(form);
    if (!d.merchant) return toast("İşletme adı gerekli");
    if (!d.date) return toast("Tarih gerekli");
    if (!d.items.length) return toast("En az bir kalem gir");
    if (d.items.some((i) => Number.isNaN(i.u))) return toast("Kalem tutarlarını kontrol et");
    if (form.declared.trim() && Number.isNaN(d.declared)) return toast("Fiş toplamını kontrol et");
    d.conf = conf;
    setSaving(true);
    const by = { name: profile?.name || "Kullanıcı" };
    let img;
    try {
      img = imageDirty ? (image ? await thumbFromDataUrl(image) : null) : undefined;
    } catch {
      img = undefined;
    }
    if (editId) {
      updateReceipt(editId, d, { by, image: img });
      toast("Fiş güncellendi");
    } else {
      saveReceipt(d, { by, image: img || null, src: aiImage ? "photo" : "manual" });
      toast(hasDeclared && !matched ? "Fiş kaydedildi · toplamı kontrol et" : "Fiş kaydedildi");
    }
    navigator.vibrate?.([10, 40, 10]);
    setSaving(false);
    onClose();
  }

  function remove() {
    if (!armed) {
      setArmed(true);
      toast("Silmek için tekrar dokun");
      setTimeout(() => setArmed(false), 2500);
      return;
    }
    deleteRecord("receipt", editId);
    toast("Fiş silindi");
    onClose();
    if (path.startsWith(`/receipts/${editId}`)) router.push("/receipts");
  }

  const title = editId ? "Fişi düzenle" : "Fiş ekle";
  const btn1 = "h-12 flex-1 rounded-xl border border-line bg-card text-base font-semibold transition active:scale-[.98]";
  const btn2 = "h-12 flex-[1.6] rounded-xl bg-acc text-base font-semibold text-white transition active:scale-[.98] disabled:opacity-50";

  return (
    <Screen open={open} onClose={onClose} title={title}>
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      <input ref={galRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      <header className="flex shrink-0 items-center justify-between px-5 py-3">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <button onClick={onClose} aria-label="Kapat" className="grid size-9 place-items-center rounded-full bg-card text-mut ring-1 ring-line transition active:scale-90">
          <Icon name="x" className="size-[18px]" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        {/* Canlı kamera (kapanınca akış durur) */}
        {open && stage === "camera" && (
          <CameraView
            onShot={takeFile}
            onError={onCamError}
            onGallery={() => galRef.current?.click()}
            onCancel={() => setStage(camBack.current)}
          />
        )}

        {/* 1. Fotoğraf seç */}
        {stage === "pick" && (
          <div className="fade-in flex min-h-full flex-col items-center justify-center py-6 text-center">
            {camError && (
              <p className="mb-5 flex w-full max-w-[320px] items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-left text-[13px] leading-snug text-amber-900">
                <Icon name="alert" className="mt-px size-4" /> {camError}
              </p>
            )}
            <span className="grid size-20 place-items-center rounded-3xl bg-card text-acc ring-1 ring-line">
              <Icon name="receipt" className="size-9" />
            </span>
            <p className="mt-4 text-[17px] font-semibold">Fişin fotoğrafını çek</p>
            <p className="mt-1 text-[14px] text-mut">Düz zemine koy, tamamı görünsün</p>
            <div className="mt-6 flex w-full max-w-[320px] flex-col gap-2.5">
              <button onClick={takePhoto} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-acc text-base font-semibold text-white transition active:scale-[.98]">
                <Icon name="camera" className="size-5" /> Fotoğraf çek
              </button>
              <button onClick={() => galRef.current?.click()} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-card text-base font-semibold transition active:scale-[.98]">
                <Icon name="image" className="size-5" /> Galeriden seç
              </button>
              <button onClick={() => setStage("form")} className="h-11 text-[15px] font-medium text-mut transition active:text-fg">
                Elle gir
              </button>
            </div>
          </div>
        )}

        {/* 2. Okunuyor */}
        {stage === "reading" && (
          <div className="fade-in flex flex-col items-center py-4 text-center">
            <div className="relative w-full max-w-[320px] overflow-hidden rounded-2xl bg-card ring-1 ring-line">
              {image ? <img src={image} alt="Fiş" className="max-h-[52vh] w-full object-contain" /> : <div className="h-64" />}
              {!error && <span className="scanline" aria-hidden="true" />}
            </div>
            {error ? (
              <div className="mt-5 w-full rounded-2xl border border-amber-300 bg-amber-50 p-4 text-left text-amber-900">
                <p className="flex items-center gap-2 text-[15px] font-semibold">
                  <Icon name="alert" className="size-[18px]" /> Okunamadı
                </p>
                <p className="mt-1 text-[14px]">{error}</p>
                <div className="mt-3 flex gap-2">
                  {aiImage && (
                    <button onClick={() => read(aiImage)} className="h-10 rounded-xl bg-amber-900 px-4 text-sm font-semibold text-white active:scale-95">
                      Tekrar dene
                    </button>
                  )}
                  <button onClick={() => { setError(""); setStage("form"); }} className="h-10 rounded-xl border border-amber-300 px-4 text-sm font-semibold active:scale-95">
                    Elle gir
                  </button>
                  <button onClick={takePhoto} className="h-10 rounded-xl px-3 text-sm font-semibold active:scale-95">
                    Yeniden çek
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-5 flex items-center gap-2 text-[17px] font-semibold">
                  <Icon name="load" className="size-5 animate-spin text-acc" /> Fiş okunuyor
                </p>
                <p className="mt-1 text-[13px] tabular-nums text-mut">{secs} sn{secs >= 12 ? " · yoğunluk olabilir" : ""}</p>
                <button onClick={cancelRead} className="mt-4 h-10 px-4 text-[15px] font-semibold text-mut active:text-fg">
                  Vazgeç
                </button>
              </>
            )}
          </div>
        )}

        {/* 3. Form */}
        {stage === "form" && (
          <div className="fade-in space-y-4 pt-1">
            {camError && (
              <p className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-[13px] leading-snug text-amber-900">
                <Icon name="alert" className="mt-px size-4" /> {camError}
              </p>
            )}
            {/* Fotoğraf + güven */}
            <div className="flex items-center gap-3">
              {image ? (
                <div className="relative">
                  <img src={image} alt="Fiş" className="size-16 rounded-xl object-cover ring-1 ring-line" />
                  <button
                    type="button"
                    onClick={() => { setImage(null); setImageDirty(true); }}
                    aria-label="Fotoğrafı kaldır"
                    className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-fg text-bg"
                  >
                    <Icon name="x" className="size-3.5" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={takePhoto} className="grid size-16 place-items-center rounded-xl border border-dashed border-line bg-card text-mut active:scale-95">
                  <Icon name="camera" className="size-6" />
                </button>
              )}
              <div className="min-w-0 flex-1">
                {avg != null ? (
                  <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${lowAny ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                    AI · %{Math.round(avg * 100)}
                  </span>
                ) : (
                  <span className="inline-block rounded-full bg-bg px-2.5 py-1 text-xs font-semibold text-mut">Elle</span>
                )}
                {lowAny && <p className="mt-1 text-[13px] text-amber-800">Turuncu alanları kontrol et</p>}
              </div>
              {image && (
                <button type="button" onClick={() => galRef.current?.click()} className="text-sm font-semibold text-acc active:opacity-50">
                  Değiştir
                </button>
              )}
            </div>

            {/* Temel bilgiler */}
            <div className="space-y-3 rounded-2xl border border-line bg-card p-3.5">
              <L label="İşletme">
                <input className={`${inp} ${lowConf(conf, "merchant") ? warn : ok}`} value={form.merchant} onChange={(e) => set({ merchant: e.target.value })} placeholder="Örn. Migros" />
              </L>
              <div className="grid grid-cols-2 gap-2.5">
                <L label="Tarih">
                  <input type="date" className={`${inp} ${lowConf(conf, "date") ? warn : ok}`} value={form.date} onChange={(e) => set({ date: e.target.value })} />
                </L>
                <L label="Saat">
                  <input type="time" className={`${inp} ${ok}`} value={form.time} onChange={(e) => set({ time: e.target.value })} />
                </L>
              </div>
              <button type="button" onClick={() => setMore((m) => !m)} className="flex items-center gap-1 text-sm font-semibold text-acc active:opacity-50">
                <Icon name="chev" className={`size-4 transition ${more ? "rotate-90" : ""}`} /> Belge ayrıntıları
              </button>
              {more && (
                <div className="fade-in space-y-3">
                  <Seg value={form.docType} options={[["fis", "Fiş"], ["fatura", "Fatura"]]} onChange={(v) => set({ docType: v })} />
                  <div className="grid grid-cols-2 gap-2.5">
                    <L label="Belge no"><input className={`${inp} ${ok}`} value={form.docNo} onChange={(e) => set({ docNo: e.target.value })} /></L>
                    <L label="Vergi no"><input inputMode="numeric" className={`${inp} ${ok}`} value={form.taxId} onChange={(e) => set({ taxId: e.target.value.replace(/\D/g, "").slice(0, 11) })} /></L>
                  </div>
                  <L label="Adres"><input className={`${inp} ${ok}`} value={form.address} onChange={(e) => set({ address: e.target.value })} /></L>
                </div>
              )}
            </div>

            {/* Kalemler */}
            <section>
              <div className="mb-2 flex items-center justify-between px-0.5">
                <h3 className={`text-[15px] font-semibold ${lowConf(conf, "items") ? "text-amber-800" : ""}`}>Kalemler</h3>
                <span className="text-[13px] text-mut">{live.items.length}</span>
              </div>
              <div className="space-y-2">
                {form.items.map((i) => {
                  const u = parseTL(i.u);
                  const line = Number.isNaN(u) ? null : Math.round(parseQty(i.q) * u);
                  return (
                    <div key={i.key} className="rounded-2xl border border-line bg-card p-2.5">
                      <div className="flex items-center gap-2">
                        <input className={`${inp} ${ok} h-10`} value={i.n} onChange={(e) => setItem(i.key, { n: e.target.value })} placeholder="Ürün / hizmet" />
                        <button type="button" onClick={() => removeItem(i.key)} aria-label="Kalemi sil" className="grid size-10 shrink-0 place-items-center rounded-xl bg-bg text-mut active:scale-90">
                          <Icon name="x" className="size-4" />
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-[60px_1fr_78px] gap-2">
                        <input inputMode="decimal" className={`${inp} ${ok} h-10 text-center`} value={i.q} onChange={(e) => setItem(i.key, { q: e.target.value })} aria-label="Adet" />
                        <input inputMode="decimal" className={`${inp} ${i.u && Number.isNaN(u) ? warn : ok} h-10 text-right tabular-nums`} value={i.u} onChange={(e) => setItem(i.key, { u: e.target.value })} placeholder="Birim ₺" aria-label="Birim fiyat" />
                        <select className={`${inp} ${lowConf(conf, "vat") ? warn : ok} h-10 px-2`} value={i.r} onChange={(e) => setItem(i.key, { r: Number(e.target.value) })} aria-label="KDV">
                          {VATS.map((v) => <option key={v} value={v}>%{v}</option>)}
                        </select>
                      </div>
                      {line != null && line !== 0 && <p className="mt-1.5 text-right text-[13px] tabular-nums text-mut">{TLk(line)}</p>}
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={() => set({ items: [...form.items, newItem()] })} className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line text-sm font-semibold text-mut active:scale-[.98]">
                <Icon name="plus" className="size-4" /> Kalem ekle
              </button>
            </section>

            {/* Toplam */}
            <section className="rounded-2xl border border-line bg-card p-3.5">
              <div className="flex justify-between text-[14px] text-mut">
                <span>KDV</span>
                <span className="tabular-nums">{TLk(totals.vat)}</span>
              </div>
              <div className="mt-1 flex justify-between text-[15px] font-semibold">
                <span>Kalemler</span>
                <span className="tabular-nums">{TLk(totals.gross)}</span>
              </div>
              <L label="Fişteki toplam" className="mt-3">
                <input inputMode="decimal" className={`${inp} ${lowConf(conf, "total") || (hasDeclared && !matched) ? warn : ok} text-right text-lg font-semibold tabular-nums`} value={form.declared} onChange={(e) => set({ declared: e.target.value })} placeholder={toInput(totals.gross) || "0,00"} />
              </L>
              {hasDeclared && (
                <p className={`mt-2 flex items-center gap-1.5 text-[13px] font-semibold ${matched ? "text-emerald-700" : "text-amber-800"}`}>
                  <Icon name={matched ? "check" : "alert"} className="size-4" />
                  {matched ? "Kalemler toplamla eşleşiyor" : `Fark: ${TLk(diff)}`}
                </p>
              )}
            </section>

            {/* Ödeme + kategori */}
            <section className="space-y-3">
              <Seg value={form.pay} options={PAYS.map((p) => [p, p])} onChange={(v) => set({ pay: v })} />
              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
                {CATS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set({ cat: c })}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition active:scale-95 ${form.cat === c ? "border-acc bg-acc text-white" : "border-line bg-card"}`}
                  >
                    <Icon name={CAT[c].icon} className="size-4" /> {c}
                  </button>
                ))}
              </div>
              <input className={`${inp} ${ok}`} value={form.note} onChange={(e) => set({ note: e.target.value })} placeholder="Not (isteğe bağlı)" />
            </section>
          </div>
        )}
      </div>

      {stage === "form" && (
        <footer className="flex shrink-0 gap-2.5 border-t border-line bg-card px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          {editId ? (
            <button onClick={remove} className={`${btn1} ${armed ? "!border-transparent !bg-rec !text-white" : "text-rec"}`}>
              {armed ? "Emin misin?" : "Sil"}
            </button>
          ) : (
            <button onClick={onClose} className={btn1}>İptal</button>
          )}
          <button onClick={save} disabled={saving} className={btn2}>Kaydet</button>
        </footer>
      )}
    </Screen>
  );
}

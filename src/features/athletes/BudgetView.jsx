"use client";

// Yarış bütçesi sekmesi: özet, kişi/gece sayısı, kategoriye göre kalemler, sporcu başına ödeme (ödendi işareti),
// yapay zekayla doldurma ve PDF çıktı. Kayıt yarışın "budget" alanına (RaceEditor otomatik kaydeder).
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Hero, Label, Seg, Stat, card } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { CATS, UNITS, cleanBudget, cleanItem, emptyBudget, howText, newId, tl, totals } from "./budget";
import { buildBudgetPdf } from "./budgetDoc";
import { openFile, shareFile } from "./fileActions";
import { loadFonts } from "./raceDocs";
import { askBudget, mergeBudget } from "./raceBudgetAi";

const CAT_ICON = { Kayıt: "receipt", Konaklama: "home", Ulaşım: "nav", Yemek: "utensils", "Tekne/Ekipman": "anchor", Diğer: "wallet" };

function Stepper({ label, value, onChange, max }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="flex-1 text-[0.9375rem]">{label}</span>
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`${label} azalt`} className="grid size-8 place-items-center rounded-full bg-bg text-acc">
        <Icon name="minus" className="size-4" />
      </button>
      <b className="w-6 text-center text-[1rem] tabular-nums">{value}</b>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`${label} artır`} className="grid size-8 place-items-center rounded-full bg-bg text-acc">
        <Icon name="plus" className="size-4" />
      </button>
    </div>
  );
}

export function BudgetView({ r, athletes, onChange }) {
  const toast = useToast();
  const b = r.budget || emptyBudget(r);
  const t = totals(b, athletes.length);
  const set = (patch) => onChange(cleanBudget({ ...b, ...patch }));
  const [edit, setEdit] = useState(null); // düzenlenen kalem (yeni için id'siz)
  const [ai, setAi] = useState(false);
  const [aiText, setAiText] = useState("");
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const saveItem = (it) => {
    const x = cleanItem(it);
    const items = b.items.some((y) => y.id === x.id) ? b.items.map((y) => (y.id === x.id ? x : y)) : [...b.items, x];
    set({ items });
    setEdit(null);
  };
  const removeItem = (id) => {
    set({ items: b.items.filter((y) => y.id !== id) });
    setEdit(null);
  };
  const runAi = async (text) => {
    setBusy(true);
    try {
      const p = await askBudget({ ...r, budget: b }, athletes.length, text);
      if (!p.items?.length && p.staff == null && p.nights == null) toast(p.message || "Eklenecek bir tutar bulamadım");
      else {
        onChange(mergeBudget({ ...r, budget: b }, p));
        toast(p.message || `${p.items.length} kalem eklendi`);
        // Tutarı boş ya da tahmini gelen tek kalem: kontrol için hemen açılır
        const check = p.items.filter((x) => !x.amount || x.est);
        if (check.length === 1) setEdit(check[0]);
        setAi(false);
        setAiText("");
      }
    } catch (e) {
      toast(e?.message || "Bütçe hazırlanamadı");
    }
    setBusy(false);
  };
  const pdf = async (share) => {
    setPdfBusy(true);
    try {
      const bytes = await buildBudgetPdf({ ...r, budget: b }, athletes, await loadFonts());
      const name = `${r.name.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "yaris"}-butce.pdf`;
      const f = new File([bytes], name, { type: "application/pdf" });
      await (share ? shareFile(f) : openFile(f, false));
    } catch (e) {
      toast(e?.message || "Çıktı hazırlanamadı");
    }
    setPdfBusy(false);
  };

  const groups = CATS.map((c) => [c, t.lines.filter((l) => l.cat === c)]).filter(([, l]) => l.length);
  const hasNoticeFees = !!(r.notice?.fees?.length || r.notice?.hotels?.length);

  return (
    <>
      <Hero className="mt-4">
        <span className="block text-[0.6875rem] font-semibold tracking-[.1em] text-white/70">TOPLAM BÜTÇE</span>
        <b className="mt-1 block text-[1.75rem] font-semibold leading-tight tabular-nums">{tl(t.total)}</b>
        <div className="mt-3 flex gap-2">
          <Stat n={t.athletes ? tl(t.perAthlete) : "-"} label="Sporcu başı" />
          <Stat n={tl(t.club)} label="Kulüp karşılar" />
        </div>
      </Hero>

      <Label>KİŞİLER</Label>
      <div className={`${card} divide-y divide-line overflow-hidden`}>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex-1 text-[0.9375rem]">Sporcu</span>
          <b className="tabular-nums">{athletes.length}</b>
        </div>
        <Stepper label="Antrenör / refakatçi" value={b.staff} max={50} onChange={(v) => set({ staff: v })} />
        <Stepper label="Gece" value={b.nights} max={60} onChange={(v) => set({ nights: v })} />
      </div>
      {!athletes.length && <p className="mt-2 px-1 text-[0.75rem] text-mut">Sporcu başı tutar için Sporcu sekmesinden sporcuları seç.</p>}

      <Label right={b.items.length ? `${b.items.length} kalem` : ""}>KALEMLER</Label>
      {groups.map(([c, lines]) => (
        <div key={c} className={`${card} mb-2 divide-y divide-line overflow-hidden`}>
          {lines.map((l) => (
            <button key={l.id} type="button" onClick={() => setEdit(l)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-acc/10 text-acc">
                <Icon name={CAT_ICON[l.cat] || "wallet"} className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-semibold">
                  {l.title}
                  {l.club && <span className="ml-1.5 rounded-md bg-ok/10 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-ok">kulüp</span>}
                  {!l.amount ? (
                    <span className="ml-1.5 rounded-md bg-rec/10 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-rec">tutar gir</span>
                  ) : (
                    l.est && <span className="ml-1.5 rounded-md bg-acc/10 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-acc">tahmini</span>
                  )}
                </b>
                <span className="block truncate text-[0.8125rem] text-mut">{howText(l, t)}</span>
              </span>
              <b className="shrink-0 text-[0.9375rem] tabular-nums">{tl(l.total)}</b>
            </button>
          ))}
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setEdit({ cat: "Kayıt", title: "", amount: "", unit: "athlete", qty: 1, club: false })} className={`${card} flex h-12 items-center justify-center gap-1.5 text-[0.875rem] font-semibold text-acc`}>
          <Icon name="plus" className="size-5" />
          Kalem ekle
        </button>
        <button type="button" onClick={() => setAi(true)} className={`${card} flex h-12 items-center justify-center gap-1.5 text-[0.875rem] font-semibold text-acc`}>
          <Icon name="spark" className="size-5" />
          Yapay zekayla
        </button>
      </div>
      {hasNoticeFees && (
        <button type="button" disabled={busy} onClick={() => runAi("Talimattaki kayıt ücretlerini ve otel fiyatlarını bütçeye ekle.")} className="mt-2 w-full rounded-xl px-4 py-2.5 text-left text-[0.8125rem] font-semibold text-acc ring-1 ring-line disabled:opacity-50">
          {busy ? "Hazırlanıyor…" : "Talimattaki ücretleri ve otelleri ekle"}
        </button>
      )}
      <p className="mt-2 px-1 text-[0.75rem] text-mut">Sesle de ekleyebilirsin: “{r.name.trim() || "Yarış"} bütçesine otel kişi başı gecelik 3500 lira ekle”.</p>

      {athletes.length > 0 && b.items.length > 0 && (
        <>
          <Label right={`${athletes.filter((a) => b.paid?.[a.id]).length}/${athletes.length} ödedi`}>SPORCU ÖDEMELERİ</Label>
          <ul className={`${card} divide-y divide-line overflow-hidden`}>
            {athletes.map((a) => {
              const on = !!b.paid?.[a.id];
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => set({ paid: Object.fromEntries(Object.entries({ ...b.paid, [a.id]: !on }).filter(([, v]) => v)) })}
                    aria-pressed={on}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg"
                  >
                    <span className={`grid size-6 shrink-0 place-items-center rounded-full ring-2 ${on ? "bg-ok text-white ring-ok" : "ring-line"}`}>{on && <Icon name="check" className="size-4 [stroke-width:3]" />}</span>
                    <span className={`min-w-0 flex-1 truncate text-[0.9375rem] ${on ? "text-mut" : "font-medium"}`}>{a.studentName}</span>
                    <span className="shrink-0 text-[0.875rem] tabular-nums text-mut">{tl(t.perAthlete)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Alt çubuk: bütçe çıktısı */}
      <div data-pagebar="" className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-bg via-bg to-transparent px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6">
        <div className="mx-auto flex max-w-[26rem] gap-2">
          <button type="button" disabled={pdfBusy || !b.items.length} onClick={() => pdf(false)} className="flex h-12 items-center gap-1.5 rounded-xl bg-card px-4 text-[0.875rem] font-semibold text-acc ring-1 ring-line disabled:opacity-50">
            <Icon name="print" className="size-5" />
            Aç
          </button>
          <button type="button" disabled={pdfBusy || !b.items.length} onClick={() => pdf(true)} className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-deep text-[0.9375rem] font-semibold text-white disabled:opacity-50">
            <Icon name="up" className="size-5" />
            {pdfBusy ? "Hazırlanıyor…" : "Bütçe çıktısı"}
          </button>
        </div>
      </div>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Kalemi düzenle" : "Kalem ekle"}>
        {edit && <ItemForm key={edit.id || "new"} item={edit} nights={b.nights} onSave={saveItem} onRemove={edit.id ? () => removeItem(edit.id) : null} />}
      </Sheet>
      <Sheet open={ai} onClose={() => setAi(false)} title="Yapay zekayla bütçe">
        <textarea
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
          placeholder="Ör: kayıt ücreti sporcu başı 1250, otel kişi başı gecelik 3500, minibüs toplam 6000, antrenör yolluğunu kulüp öder"
          rows={6}
          className="block w-full resize-none rounded-2xl bg-bg px-4 py-3 text-[0.9375rem] leading-relaxed outline-none placeholder:text-mut/70"
        />
        <p className="mt-2 px-1 text-[0.75rem] text-mut">Klavyedeki mikrofonla söyleyebilirsin. Talimattaki ücretler de dikkate alınır; kalemler mevcut bütçeye eklenir.</p>
        <button type="button" disabled={busy || aiText.trim().length < 4} onClick={() => runAi(aiText)} className="sticky bottom-0 mt-3 h-12 w-full rounded-xl bg-acc text-[0.9375rem] font-semibold text-white disabled:opacity-50">
          {busy ? "Hazırlanıyor…" : "Bütçeye ekle"}
        </button>
      </Sheet>
    </>
  );
}

function ItemForm({ item, nights, onSave, onRemove }) {
  const [x, setX] = useState({ ...item, id: item.id || newId(), amount: item.amount === "" || item.amount === 0 ? "" : String(item.amount).replace(".", ",") });
  const put = (k) => (v) => setX((p) => ({ ...p, [k]: v }));
  const amount = Number(String(x.amount).replace(/\./g, "").replace(",", ".")) || 0;
  const field = "h-11 w-full rounded-xl bg-bg px-3.5 text-[0.9375rem] outline-none placeholder:text-mut/70";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setX((p) => ({ ...p, cat: c, qty: c === "Konaklama" && (p.qty || 1) === 1 && nights ? nights : p.qty, unit: c === "Konaklama" && p.unit === "athlete" ? "person" : p.unit }))}
            aria-pressed={x.cat === c}
            className={`rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold ${x.cat === c ? "bg-acc text-white" : "bg-bg text-mut"}`}
          >
            {c}
          </button>
        ))}
      </div>
      <input value={x.title} onChange={(e) => put("title")(e.target.value)} placeholder="Kalem adı (ör. Kayıt ücreti)" className={field} />
      <div className="flex items-center gap-2">
        <input value={x.amount} onChange={(e) => put("amount")(e.target.value.replace(/[^\d.,]/g, ""))} inputMode="decimal" placeholder="Tutar" className={`${field} flex-1`} />
        <span className="text-[0.9375rem] font-semibold text-mut">₺</span>
      </div>
      <Seg value={x.unit} onChange={put("unit")} options={UNITS} />
      <p className="-mt-2 px-1 text-[0.75rem] text-mut">
        {x.unit === "athlete" ? "Her sporcu için (kayıt ücreti)." : x.unit === "person" ? "Antrenör dahil herkes için (otel, yemek)." : "Toplam tutar; sporculara bölünür (minibüs, yakıt)."}
      </p>
      <div className="flex items-center gap-3">
        <span className="flex-1 text-[0.9375rem]">{x.cat === "Konaklama" ? "Gece" : "Adet"}</span>
        <input type="number" min="1" value={x.qty} onChange={(e) => put("qty")(e.target.value)} className="h-11 w-24 rounded-xl bg-bg px-3 text-center text-[0.9375rem] outline-none" />
      </div>
      <button type="button" onClick={() => put("club")(!x.club)} aria-pressed={x.club} className="flex w-full items-center gap-3 text-left">
        <span className={`grid size-6 shrink-0 place-items-center rounded-full ring-2 ${x.club ? "bg-ok text-white ring-ok" : "ring-line"}`}>{x.club && <Icon name="check" className="size-4 [stroke-width:3]" />}</span>
        <span className="text-[0.9375rem]">Kulüp karşılar (sporcu payına girmez)</span>
      </button>
      <div className="flex gap-2 pt-1">
        {onRemove && (
          <button type="button" onClick={onRemove} className="h-12 rounded-xl px-4 text-[0.9375rem] font-semibold text-rec ring-1 ring-line">
            Sil
          </button>
        )}
        <button type="button" disabled={!amount} onClick={() => onSave({ ...x, amount, est: false })} className="h-12 flex-1 rounded-xl bg-acc text-[0.9375rem] font-semibold text-white disabled:opacity-50">
          Kaydet
        </button>
      </div>
    </div>
  );
}

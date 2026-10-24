"use client";

import { useMemo, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ListHead, RowList } from "@/components/ui/Row";
import { useToast } from "@/components/ui/ToastProvider";
import { newId, tl } from "../catalog";
import { findProduct, parseIngredient } from "../menus";
import { saveMenu, useCatalog, useMenus } from "../store";

// Yeni menü / menüyü düzenle: ad, kaç kişilik, malzemeler (her satıra bir tane: "500 g dana kıyma").
// Yazarken altta marketteki karşılıkları görünür; olmayan "Bulunamadı".
export function MenuEdit({ orgId, start, onDone }) {
  const toast = useToast();
  const products = useCatalog(orgId);
  const menus = useMenus(orgId);
  const [name, setName] = useState(start?.name || "");
  const [serves, setServes] = useState(String(start?.serves || 4));
  const [text, setText] = useState(() => (start?.items || []).map((i) => [i.amount, i.name].filter(Boolean).join(" ")).join("\n"));
  const [busy, setBusy] = useState(false);
  const list = useMemo(() => Object.values(products || {}), [products]);
  const items = useMemo(() => text.split("\n").map(parseIngredient).filter(Boolean), [text]);
  const problem = !name.trim() ? "Ad yaz" : !items.length ? "Malzeme yaz" : "";

  async function save() {
    setBusy(true);
    const taken = Object.fromEntries((menus || []).filter((m) => m.id !== start?.id).map((m) => [m.id, true]));
    const menu = { ...(start || {}), id: start?.id || newId(taken, name), name: name.trim(), serves: Math.max(1, Number(serves) || 4), photo: start?.photo || "", items };
    try {
      await saveMenu(orgId, menu);
      onDone(menu);
    } catch {
      toast("Kaydedilemedi");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--dome-h,var(--stage-h,6rem))+2rem)]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Menü">
        <header className="flex items-center gap-2.5">
          <BackButton onClick={() => onDone(null)} />
          <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-bold tracking-[-.02em]">{start ? "Menüyü düzenle" : "Yeni menü"}</h1>
        </header>
      </section>
      <div className="relative -mx-5 -mt-6 min-h-[50vh] space-y-4 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        <div className="grid grid-cols-[1fr_6rem] gap-2.5">
          <Field label="Ad" value={name} onChange={(e) => setName(e.target.value)} placeholder="Karnıyarık" />
          <Field label="Kişi" value={serves} onChange={(e) => setServes(e.target.value)} inputMode="numeric" />
        </div>
        <label className="block">
          <span className="text-[0.8125rem] font-medium text-mut">Malzemeler</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder={"500 g dana kıyma\n2 adet patlıcan\nMuskat"}
            className="mt-1.5 w-full rounded-xl border border-transparent bg-card px-3.5 py-3 text-base outline-none ring-1 ring-line focus:ring-acc" />
        </label>
        {items.length > 0 && (
          <section>
            <ListHead title="Markette" count={items.filter((i) => findProduct(list, i.name)).length} />
            <RowList>
              {items.map((i, k) => {
                const p = findProduct(list, i.name);
                return (
                  <div key={k} className="flex min-h-[3rem] items-center gap-3 border-t border-line py-2 first:border-t-0">
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[0.9375rem] font-semibold">{i.name}</b>
                      <small className={`block truncate text-[0.8125rem] ${p ? "text-mut" : "text-warn"}`}>{p ? [i.amount, `${p.name} ${p.size}`].filter(Boolean).join(" · ") : "Bulunamadı"}</small>
                    </span>
                    {p && <span className="shrink-0 font-bold tabular-nums">{tl(p.price * i.qty)}</span>}
                  </div>
                );
              })}
            </RowList>
          </section>
        )}
        <div className="grid grid-cols-[1fr_1.7fr] gap-2.5">
          <Button variant="secondary" onClick={() => onDone(null)}>Vazgeç</Button>
          <Button loading={busy} disabled={!!problem} onClick={save}>{problem || "Kaydet"}</Button>
        </div>
      </div>
    </main>
  );
}

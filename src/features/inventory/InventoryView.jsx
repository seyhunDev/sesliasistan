"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { Chips, Empty, Hero, HeroLabel, Label, Seg, Stat, card } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { todayStr } from "@/lib/utils/format";
import { BAD, KINDS, OWNERS, addKit, ageText, cleanItem, countText, dropItem, excelRows, groupItems, invStats, isBoat, isPart, itemLabel, kindOf, kitText, nextNo, searchItems, stateLabel, upsertItem } from "./invModel";
import { changeInventory, deleteInventory, loadInventories, setLastInv } from "./inventory";
import { ItemForm, input } from "./ItemForm";

const tl = (n) => `${Math.round(n || 0).toLocaleString("tr-TR")} ₺`;
const OPS = { add: ["Eklendi", "text-ok"], remove: ["Çıkarıldı", "text-rec"], edit: ["Düzenlendi", "text-mut"], delete: ["Silindi", "text-rec"] };

export function InventoryView({ orgId, id, by }) {
  const router = useRouter();
  const toast = useToast();
  const [inv, setInv] = useState(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState("items");
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [own, setOwn] = useState(""); // "" hepsi | club | private
  const [item, setItem] = useState(null); // düzenlenen ürün
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    setLastInv(id);
    const load = () =>
      loadInventories(orgId).then(
        (list) => {
          const v = list.find((x) => x.id === id);
          if (v) setInv(v);
          else setMissing(true);
        },
        () => setMissing(true),
      );
    load();
    const on = (e) => e.detail?.id === id && load();
    window.addEventListener("sa-inv-saved", on);
    return () => window.removeEventListener("sa-inv-saved", on);
  }, [orgId, id]);

  const change = async (fn, ok) => {
    try {
      setInv(await changeInventory(orgId, id, fn));
      if (ok) toast(ok);
      return true;
    } catch {
      toast("Kaydedilemedi, bağlantını kontrol et");
      return false;
    }
  };

  const shown = useMemo(() => (inv ? searchItems(inv.items.filter((x) => (!cat || x.cat === cat) && (!own || x.owner === own)), q) : []), [inv, cat, own, q]);
  if (missing) return <Wrap title="Envanter">{<p className="mt-6 text-center text-[0.875rem] text-mut">Envanter bulunamadı.</p>}</Wrap>;
  if (!inv)
    return (
      <Wrap title="Envanter">
        <Loading label="Envanter yükleniyor" />
      </Wrap>
    );

  const st = invStats(inv);
  const counts = new Map();
  for (const x of inv.items) counts.set(x.cat, (counts.get(x.cat) || 0) + 1);
  const chips = [["", "Tümü", inv.items.length], ...groupItems(inv.items, inv.cats).map(([c, l]) => [c, c, l.length])];
  const groups = groupItems(shown, inv.cats);
  const byId = new Map(inv.items.map((x) => [x.id, x]));
  const hasPrivate = inv.items.some((x) => x.owner === "private");

  const saveItem = async (x) => {
    const done = await change((cur) => upsertItem(cur, { ...x, qty: Number(x.qty) || 0 }, { by }), x.id ? "Kaydedildi" : "Eklendi");
    if (done) setItem(null);
  };
  // Teknenin eksik takımı (salma, dümen, direk, bumba, yelken) oluşturulur ve bağlanır; form güncel tekneyle açık kalır
  const makeKit = async (boatId) => {
    let next = null;
    const ok = await change((cur) => (next = addKit(cur, boatId, { by })), "Takım eklendi");
    if (ok && next) setItem(next.items.find((x) => x.id === boatId) || null);
  };
  const delItem = async (x) => {
    if (!window.confirm(`“${x.name}” envanterden silinsin mi?`)) return;
    if (await change((cur) => dropItem(cur, x.id, { by }), "Silindi")) setItem(null);
  };
  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    for (const [name, rows] of Object.entries(excelRows(inv))) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
    XLSX.writeFile(wb, `envanter-${inv.name.toLocaleLowerCase("tr-TR").replace(/\s+/g, "-")}-${todayStr()}.xlsx`);
  };

  return (
    <Wrap
      title={inv.name}
      right={
        <>
          <button type="button" onClick={() => setSettings({ name: inv.name, kind: inv.kind, prefix: inv.prefix, cats: inv.cats, add: "" })} aria-label="Envanter ayarları" className="grid size-10 place-items-center rounded-full bg-card text-fg shadow-[0_1px_3px_rgba(38,40,44,.08)] active:scale-90">
            <Icon name="sliders" className="size-5" />
          </button>
          <button type="button" onClick={() => setItem(cleanItem({ id: "", no: nextNo(inv), cat: cat || inv.cats[0], addedAt: todayStr(), qty: 1 }))} className="flex h-10 items-center gap-1.5 rounded-full bg-acc px-4 text-[0.875rem] font-semibold text-white active:scale-95">
            <Icon name="plus" className="size-[1.125rem]" />
            Ürün
          </button>
        </>
      }
    >
      <Hero className="mt-2">
        <div className="flex items-center justify-between gap-3">
          <HeroLabel>{kindOf(inv.kind)[1].toLocaleUpperCase("tr-TR")}</HeroLabel>
          <Icon name={kindOf(inv.kind)[2]} className="size-4 text-white/80" />
        </div>
        <div className="mt-3 flex gap-2">
          <Stat n={st.items} label="ürün" />
          <Stat n={st.qty} label="toplam adet" />
          <Stat n={st.bad} label="sorunlu" tone={st.bad ? "rec" : ""} />
        </div>
        {st.value > 0 && <p className="mt-2.5 text-[0.75rem] text-white/75">Kayıtlı alış değeri {tl(st.value)}</p>}
      </Hero>

      <Seg value={tab} onChange={setTab} options={[["items", "Ürünler", inv.items.length], ["log", "Hareketler", inv.log.length]]} className="mt-4" />

      {tab === "items" ? (
        inv.items.length === 0 ? (
          <Empty icon={kindOf(inv.kind)[2]} title="Henüz ürün yok" sub="“Ürün” ile ekle ya da asistana söyle: “3 Optimist teknesi, 2 el telsizi ve bir lazer yazıcı ekle”." />
        ) : (
          <>
            <div className="relative mt-3">
              <Icon name="search" className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-mut" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara: ad, no, yer, kimde…" className={`${input} bg-card pl-9`} />
            </div>
            <Chips value={cat} onChange={setCat} options={chips} className="mt-3" />
            {hasPrivate && <Seg value={own} onChange={setOwn} options={[["", "Hepsi"], ...OWNERS]} className="mt-3" />}
            {groups.length === 0 && <p className="mt-6 text-center text-[0.875rem] text-mut">Bulunamadı.</p>}
            {groups.map(([c, list]) => (
              <section key={c}>
                <Label right={countText(list, isPart({ cat: c }))}>{c.toLocaleUpperCase("tr-TR")}</Label>
                <ul className={`${card} divide-y divide-line/70 overflow-hidden`}>
                  {list.map((x) => (
                    <li key={x.id}>
                      <button type="button" onClick={() => setItem(x)} className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-bg">
                        <span className="w-12 shrink-0 text-[0.75rem] font-semibold tabular-nums text-mut">{x.no}</span>
                        <span className="min-w-0 flex-1">
                          <b className={`block truncate text-[0.9375rem] font-medium ${x.qty === 0 ? "text-mut line-through" : ""}`}>{x.name}</b>
                          <span className="block truncate text-[0.75rem] text-mut">
                            {[x.parent && byId.get(x.parent) && `→ ${itemLabel(byId.get(x.parent))}`, x.sailNo, x.brand, x.year && ageText(x.year), x.place, x.assignee && `Kimde: ${x.assignee}`].filter(Boolean).join(" · ") ||
                              `Eklendi ${x.addedAt.split("-").reverse().join(".")}`}
                          </span>
                          {(x.owner === "private" || x.damage || (isBoat(x) && kitText(inv, x))) && (
                            <span className="mt-0.5 flex flex-wrap gap-x-2 text-[0.6875rem] font-semibold">
                              {x.owner === "private" && <span className="text-acc">Özel{x.ownerName ? ` · ${x.ownerName}` : ""}</span>}
                              {isBoat(x) && kitText(inv, x) && <span className={kitText(inv, x) === "Tam takım" ? "text-ok" : "text-mut"}>{kitText(inv, x)}</span>}
                              {x.damage && <span className="text-rec">Hasar: {x.damage}</span>}
                            </span>
                          )}
                        </span>
                        {x.state !== "good" && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${BAD.includes(x.state) ? "bg-rec/10 text-rec" : "bg-acc/10 text-acc"}`}>{stateLabel(x.state)}</span>}
                        <span className="shrink-0 text-right tabular-nums">
                          <b className="block text-[1rem] font-semibold leading-tight">{x.qty}</b>
                          <small className="text-[0.6875rem] text-mut">{x.unit}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <button type="button" onClick={exportXlsx} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-card text-[0.875rem] font-semibold text-acc ring-1 ring-line active:scale-[.98]">
              <Icon name="download" className="size-4" />
              Excel’e aktar
            </button>
          </>
        )
      ) : inv.log.length === 0 ? (
        <p className="mt-6 text-center text-[0.875rem] text-mut">Henüz hareket yok.</p>
      ) : (
        <ul className={`${card} mt-4 divide-y divide-line/70`}>
          {inv.log.map((e, i) => (
            <li key={i} className="px-3.5 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <b className="min-w-0 truncate text-[0.875rem] font-medium">
                  {e.no && <span className="mr-1.5 tabular-nums text-mut">{e.no}</span>}
                  {e.name}
                </b>
                <small className={`shrink-0 text-[0.75rem] font-semibold ${OPS[e.op][1]}`}>
                  {OPS[e.op][0]}
                  {e.qty && e.op !== "edit" ? ` ${e.qty > 0 ? "+" : ""}${e.qty}` : ""}
                </small>
              </div>
              <small className="block truncate text-[0.75rem] text-mut">{[e.at.slice(0, 16).replace("T", " ").split(" ").map((p, j) => (j ? p : p.split("-").reverse().join("."))).join(" "), e.text, e.by].filter(Boolean).join(" · ")}</small>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!item} onClose={() => setItem(null)} title={item?.id ? "Ürün" : "Yeni ürün"}>
        {item && <ItemForm key={`${item.id || "new"}:${item.updatedAt}`} start={item} cats={inv.cats} inv={inv} onSave={saveItem} onDelete={item.id ? () => delItem(item) : null} onOpen={setItem} onKit={makeKit} />}
      </Sheet>

      <Sheet open={!!settings} onClose={() => setSettings(null)} title="Envanter ayarları">
        {settings && (
          <Settings
            v={settings}
            set={setSettings}
            counts={counts}
            onSave={async () => {
              const ok = await change((cur) => ({ ...cur, name: settings.name.trim() || cur.name, kind: settings.kind, prefix: settings.prefix, cats: settings.cats }), "Kaydedildi");
              if (ok) setSettings(null);
            }}
            onDelete={async () => {
              if (!window.confirm(`“${inv.name}” envanteri ve içindeki ${inv.items.length} ürün silinsin mi? Geri alınamaz.`)) return;
              try {
                await deleteInventory(orgId, id);
                toast("Envanter silindi");
                router.push("/inventory");
              } catch {
                toast("Silinemedi");
              }
            }}
          />
        )}
      </Sheet>
    </Wrap>
  );
}

function Wrap({ title, right, children }) {
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <PageHeader title={title} back="/inventory">
        {right}
      </PageHeader>
      {children}
    </main>
  );
}

// Ad, tür, numara öneki, kategoriler (ekle, sil, sırala), envanteri sil
function Settings({ v, set, counts, onSave, onDelete }) {
  const addCat = () => {
    const c = v.add.trim();
    if (!c || v.cats.some((x) => x.toLocaleLowerCase("tr-TR") === c.toLocaleLowerCase("tr-TR"))) return set({ ...v, add: "" });
    set({ ...v, cats: [...v.cats, c], add: "" });
  };
  const move = (i, d) => {
    const cats = [...v.cats];
    const j = i + d;
    if (j < 0 || j >= cats.length) return;
    [cats[i], cats[j]] = [cats[j], cats[i]];
    set({ ...v, cats });
  };
  return (
    <div className="space-y-4 pb-2">
      <label className="block">
        <span className="text-[0.8125rem] font-medium text-mut">Adı</span>
        <input value={v.name} maxLength={40} onChange={(e) => set({ ...v, name: e.target.value })} className={`mt-1.5 ${input}`} />
      </label>
      <div>
        <span className="text-[0.8125rem] font-medium text-mut">Türü</span>
        <div className="mt-1.5 flex gap-2">
          {KINDS.map(([k, l, icon]) => (
            <button key={k} type="button" onClick={() => set({ ...v, kind: k })} aria-pressed={v.kind === k} className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-[0.875rem] font-semibold ${v.kind === k ? "bg-deep text-white" : "bg-bg text-fg"}`}>
              <Icon name={icon} className="size-4" />
              {l}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="text-[0.8125rem] font-medium text-mut">Numara öneki (isteğe bağlı)</span>
        <input value={v.prefix} maxLength={6} placeholder="ör. DYK → DYK-001" onChange={(e) => set({ ...v, prefix: e.target.value.toLocaleUpperCase("tr-TR").replace(/\s/g, "") })} className={`mt-1.5 ${input}`} />
        <span className="mt-1 block text-[0.75rem] text-mut">Yeni ürünlere verilir; var olan numaralar değişmez (ürünün içinden elle değişir).</span>
      </label>
      <div>
        <span className="text-[0.8125rem] font-medium text-mut">Kategoriler</span>
        <ul className="mt-1.5 divide-y divide-line/70 rounded-xl bg-bg">
          {v.cats.map((c, i) => (
            <li key={c} className="flex items-center gap-1 py-1 pl-3 pr-1">
              <span className="min-w-0 flex-1 truncate text-[0.875rem]">{c}</span>
              {counts.get(c) > 0 && <small className="mr-1 tabular-nums text-mut">{counts.get(c)}</small>}
              <button type="button" onClick={() => move(i, -1)} aria-label="Yukarı" className="grid size-8 place-items-center rounded-lg text-mut active:bg-card">
                <Icon name="up" className="size-4" />
              </button>
              <button
                type="button"
                disabled={counts.get(c) > 0}
                onClick={() => set({ ...v, cats: v.cats.filter((x) => x !== c) })}
                aria-label="Kategoriyi sil"
                className="grid size-8 place-items-center rounded-lg text-mut active:bg-card disabled:opacity-30"
              >
                <Icon name="x" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2">
          <input value={v.add} maxLength={30} placeholder="Yeni kategori" onChange={(e) => set({ ...v, add: e.target.value })} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCat())} className={input} />
          <button type="button" onClick={addCat} className="h-11 shrink-0 rounded-xl bg-bg px-4 text-[0.875rem] font-semibold text-acc">
            Ekle
          </button>
        </div>
        <span className="mt-1 block text-[0.75rem] text-mut">İçinde ürün olan kategori silinmez; önce ürünleri başka kategoriye taşı.</span>
      </div>
      <Button onClick={onSave}>Kaydet</Button>
      <button type="button" onClick={onDelete} className="h-11 w-full rounded-xl text-[0.875rem] font-semibold text-rec active:bg-bg">
        Envanteri sil
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { BackButton } from "@/components/ui/BackButton";
import { Loading } from "@/components/ui/Loader";
import { ListHead, RowList } from "@/components/ui/Row";
import { Empty } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { KINDS, kindOf, statsText } from "./invModel";
import { createInventory, loadInventories } from "./inventory";

// Envanterler listesi: her biri bir kart (ürün, adet, bakımda olanlar). "Yeni" ile başka envanter açılır.
export function InventoryHome({ orgId }) {
  const router = useRouter();
  const toast = useToast();
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [add, setAdd] = useState(null); // { name, kind }
  const [busy, setBusy] = useState(false);
  const [going, setGoing] = useState(""); // dokunulan envanter: sayfa açılana kadar vurgulu kalır

  useEffect(() => {
    const load = (force) => loadInventories(orgId, { force }).then(setList, (e) => (setList([]), setError(e?.message || "Envanter alınamadı.")));
    load(false);
    const on = () => load(false);
    window.addEventListener("sa-inv-saved", on);
    return () => window.removeEventListener("sa-inv-saved", on);
  }, [orgId]);

  const create = async () => {
    setBusy(true);
    try {
      const v = await createInventory(orgId, add.name.trim(), add.kind, (list?.length || 0) + 1);
      setAdd(null);
      router.push(`/inventory/${v.id}`);
    } catch {
      toast("Oluşturulamadı, bağlantını kontrol et");
    } finally {
      setBusy(false);
    }
  };

  // Yeni tasarım (2026-11-03): lacivert üstte ad, sayı ve "+ Envanter"; altta Envanterler listesi (ad · ürün/adet · kategoriler)
  return (
    <main className="split mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Envanter">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Envanter</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{list ? `${list.length} envanter` : "Yükleniyor…"}</p>
          </div>
          <button type="button" onClick={() => setAdd({ name: "", kind: "normal" })} data-press className="btn btn-primary btn-sm shrink-0 gap-1">
            <Icon name="plus" className="size-4" />
            Envanter
          </button>
        </header>
      </section>

      <div className="split-cols relative -mx-5 -mt-6 min-h-[50vh] space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {error && <p className="text-center text-[0.875rem] text-rec">{error}</p>}
        {!list ? (
          <Loading label="Envanter yükleniyor" />
        ) : !list.length ? (
          !error && <Empty icon="box" title="Envanter yok" />
        ) : (
          <section>
            <ListHead title="Envanterler" count={list.length} />
            <RowList>
              {list.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    if (going) return;
                    setGoing(v.id);
                    router.push(`/inventory/${v.id}`);
                  }}
                  data-press="row"
                  className={`flex min-h-[3.5rem] w-full items-center gap-3 border-t border-line py-2.5 text-left first:border-t-0 ${going === v.id ? "text-acc" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-semibold">{v.name}</b>
                    <small className="block truncate text-[0.8125rem] text-mut">{[statsText(v), v.cats.slice(0, 6).join(", ")].filter(Boolean).join(" · ")}</small>
                  </span>
                  <span className="shrink-0 text-[0.8125rem] font-semibold text-mut">{kindOf(v.kind)[1]}</span>
                  <Icon name={going === v.id ? "load" : "chev"} className={`size-4 shrink-0 ${going === v.id ? "animate-spin text-acc" : "text-mut"}`} />
                </button>
              ))}
            </RowList>
          </section>
        )}
      </div>

      <Sheet open={!!add} onClose={() => setAdd(null)} title="Yeni envanter">
        {add && (
          <div className="space-y-4 pb-2">
            <Field label="Adı" value={add.name} maxLength={40} placeholder="ör. Ev, Tekne malzemeleri" onChange={(e) => setAdd({ ...add, name: e.target.value })} />
            <div>
              <span className="text-[0.8125rem] font-medium text-mut">Türü (hazır kategoriler buna göre gelir)</span>
              <div className="mt-1.5 flex gap-2">
                {KINDS.map(([k, l, icon]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setAdd({ ...add, kind: k })}
                    aria-pressed={add.kind === k}
                    className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-[0.875rem] font-semibold ${add.kind === k ? "bg-deep text-white" : "bg-bg text-fg"}`}
                  >
                    <Icon name={icon} className="size-4" />
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <Button disabled={!add.name.trim()} loading={busy} onClick={create}>
              Oluştur
            </Button>
          </div>
        )}
      </Sheet>
    </main>
  );
}

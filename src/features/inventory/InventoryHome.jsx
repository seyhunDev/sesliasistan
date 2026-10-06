"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { Label, card } from "@/components/ui/Page";
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

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Envanter" sub={list ? `${list.length} envanter` : "Yükleniyor…"}>
        <button type="button" onClick={() => setAdd({ name: "", kind: "normal" })} className="flex h-10 items-center gap-1.5 rounded-full bg-acc px-4 text-[0.875rem] font-semibold text-white active:scale-95">
          <Icon name="plus" className="size-[1.125rem]" />
          Envanter
        </button>
      </PageHeader>
      {error && <p className="mt-3 text-center text-[0.875rem] text-rec">{error}</p>}
      {!list ? (
        <Loading label="Envanter yükleniyor" />
      ) : (
        <>
          <Label right={list.length}>ENVANTERLER</Label>
          <ul className="space-y-2.5">
            {list.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (going) return;
                    setGoing(v.id);
                    router.push(`/inventory/${v.id}`);
                  }}
                  className={`${card} flex w-full items-center gap-3 p-3.5 text-left transition duration-150 active:scale-[.97] active:bg-acc/10 ${going === v.id ? "scale-[.98] bg-acc/10 ring-2 ring-acc/40" : ""}`}
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-acc/10 text-acc">
                    <Icon name={kindOf(v.kind)[2]} className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-semibold">{v.name}</b>
                    <span className="block truncate text-[0.8125rem] text-mut">{statsText(v)}</span>
                    <span className="mt-0.5 block truncate text-[0.75rem] text-mut">{v.cats.slice(0, 6).join(", ")}</span>
                  </span>
                  <Icon name={going === v.id ? "load" : "chev"} className={`size-4 shrink-0 ${going === v.id ? "animate-spin text-acc" : "text-mut"}`} />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-5 px-1 text-[0.8125rem] leading-relaxed text-mut">
            Asistana söyle: “Envantere 3 Optimist teknesi ekle”, “envanterden 2 şamandıra çıkar”, “kulüp envanterinde kaç telsiz var”. Envanter sayfasındayken “envanter” demene gerek yok.
          </p>
        </>
      )}

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

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { ListHead, RowList, Row } from "@/components/ui/Row";
import { useToast } from "@/components/ui/ToastProvider";
import { PAYS, STATUS_NAMES, isOpenOrder } from "../order";
import { saveMe, herePos } from "../store";
import { AddressForm } from "./AddressForm";
import { tl } from "./Img";

// Yemek ayarların (Seyhun 2026-10-25): Ne yiyelim › ⋯. Yönetim, restoran ve kurye ekranları Velora Food'da;
// burada yalnız kullanıcının kendi işleri: adresler (ekle / düzenle / sil), varsayılan ödeme, önceki siparişler (Aynısı).
export function FoodSettings({ open, onClose, orgId, food, orders, day, onAgain }) {
  const toast = useToast();
  const [edit, setEdit] = useState(null); // null | "new" | adres id
  const [pos, setPos] = useState(null);
  const addresses = food?.me.addresses || [];
  const pay = food?.me.pay || "kapıda-kart";
  const past = (orders || []).filter((o) => !isOpenOrder(o)); // durumu şu anki hali (deneme siparişi saatten)

  const close = () => {
    setEdit(null);
    onClose();
  };
  const startEdit = (id) => {
    herePos().then(setPos);
    setEdit(id);
  };
  const save = async (patch, fail) => {
    try {
      await saveMe(orgId, patch);
      return true;
    } catch {
      toast(fail);
      return false;
    }
  };

  return (
    <Sheet open={open} onClose={close} title={edit ? (edit === "new" ? "Yeni adres" : "Adresi düzenle") : "Yemek ayarların"}>
      {edit ? (
        <AddressForm key={edit} pos={pos} start={edit === "new" ? null : addresses.find((a) => a.id === edit)}
          onCancel={() => setEdit(null)}
          onDelete={edit === "new" ? null : async () => (await save({ addresses: addresses.filter((a) => a.id !== edit) }, "Silinemedi")) && setEdit(null)}
          onSave={async (a) => {
            const list = addresses.some((x) => x.id === a.id) ? addresses.map((x) => (x.id === a.id ? a : x)) : [...addresses, a];
            if (await save({ addresses: list }, "Adres kaydedilemedi")) setEdit(null);
          }} />
      ) : (
        <div className="space-y-6 pb-6">
          <section>
            <ListHead title="Adreslerin" count={addresses.length || undefined} />
            {addresses.length > 0 && <RowList>{addresses.map((a) => <Row key={a.id} title={a.name} sub={a.text} onClick={() => startEdit(a.id)} />)}</RowList>}
            <div className={addresses.length ? "mt-2.5" : ""}><Button variant="secondary" onClick={() => startEdit("new")}>Adres ekle</Button></div>
          </section>

          <section>
            <ListHead title="Ödeme" />
            <div className="flex gap-2">
              {PAYS.map(([k, n]) => (
                <button key={k} type="button" aria-pressed={pay === k} onClick={() => pay !== k && save({ pay: k }, "Kaydedilemedi")} data-press
                  className={`flex-1 rounded-xl border py-2.5 text-[0.875rem] font-semibold ${pay === k ? "border-acc bg-accbg text-acc" : "border-line bg-card"}`}>{n}</button>
              ))}
            </div>
          </section>

          <section>
            <ListHead title="Önceki siparişler" count={past.length || undefined} />
            {past.length ? (
              <RowList>
                {past.map((o) => (
                  <div key={o.id} className="flex min-h-[3.5rem] items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                    <Link href={`/yemek/siparis/${o.id}`} onClick={close} className="min-w-0 flex-1">
                      <b className="block truncate text-[0.9375rem] font-semibold">{o.placeName} · {o.lines.map((l) => l.name).join(", ")}</b>
                      <small className="block truncate text-[0.8125rem] text-mut">
                        {day(o.at)} · {tl(o.total)}{o.status === "cancelled" ? ` · ${STATUS_NAMES.cancelled}` : o.rating ? ` · ★${o.rating}` : ""}
                      </small>
                    </Link>
                    {o.status !== "cancelled" && <button type="button" onClick={() => (close(), onAgain(o))} data-press className="btn btn-secondary btn-sm shrink-0">Aynısı</button>}
                  </div>
                ))}
              </RowList>
            ) : (
              <p className="px-1 text-[0.875rem] text-mut">Henüz sipariş yok</p>
            )}
          </section>
        </div>
      )}
    </Sheet>
  );
}

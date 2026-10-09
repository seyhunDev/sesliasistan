"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Label, card } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { cleanRooms, roomLine } from "./budget";
import { cleanHotel, telOf } from "./races";

const input = "h-11 w-full rounded-xl bg-bg px-3 text-[0.9375rem] outline-none placeholder:text-mut/60";

// Özet › Konaklama: talimattaki oteller (bir ya da birden çok); telefonu olan aranır, otel elle eklenir/düzeltilir/silinir.
export function RaceHotels({ hotels, onChange, onRooms, roomsBusy }) {
  const [edit, setEdit] = useState(null); // { i (yeni: -1), name, phone, note, rooms }
  const save = () => {
    const h = cleanHotel(edit);
    if (!h) return;
    onChange(edit.i < 0 ? [...hotels, h] : hotels.map((x, i) => (i === edit.i ? h : x)));
    setEdit(null);
  };
  const drop = () => {
    onChange(hotels.filter((_, i) => i !== edit.i));
    setEdit(null);
  };
  const put = (k) => (e) => setEdit((p) => ({ ...p, [k]: e.target.value }));
  return (
    <>
      <Label right={hotels.length > 1 ? `${hotels.length} otel` : ""}>KONAKLAMA</Label>
      <ul className={`${card} divide-y divide-line overflow-hidden`}>
        {hotels.map((h, i) => {
          const tel = telOf(h.phone);
          const rooms = cleanRooms(h.rooms);
          return (
            <li key={`${h.name}-${i}`} className="py-1">
              <span className="flex items-center gap-2 pl-4 pr-2">
                <button type="button" onClick={() => setEdit({ i, ...h })} className="min-w-0 flex-1 py-2 text-left">
                  <b className="block text-[0.9375rem] font-semibold">{h.name}</b>
                  <span className="block text-[0.8125rem] tabular-nums text-mut">{h.phone || "Telefon yok · eklemek için dokun"}</span>
                  {h.note && <span className="block break-words text-[0.8125rem] text-mut">{h.note}</span>}
                </button>
                {tel && (
                  <a href={tel} aria-label={`${h.name} ara`} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-ok px-3.5 text-[0.8125rem] font-semibold text-white active:scale-95">
                    <Icon name="phone" className="size-4" />
                    Ara
                  </a>
                )}
              </span>
              {rooms.length > 0 && (
                <ul className="mx-4 mb-2 mt-1 divide-y divide-line overflow-hidden rounded-xl bg-bg">
                  {rooms.map((x, j) => (
                    <li key={j} className="flex items-baseline gap-3 px-3 py-2">
                      <span className="min-w-0 flex-1 text-[0.875rem]">
                        {x.label || (x.cap === 1 ? "Tek kişilik" : `${x.cap} kişilik`)}
                        {x.board && <span className="block text-[0.75rem] text-mut">{x.board}</span>}
                      </span>
                      <span className="shrink-0 text-right">
                        <b className="block text-[0.875rem] font-semibold tabular-nums">{x.price || roomLine(x)}</b>
                        {x.amount > 0 && x.cap > 1 && <span className="block text-[0.75rem] tabular-nums text-mut">{roomLine(x).split(" · ").slice(1, 3).join(" · ")}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
        <li>
          <button type="button" onClick={() => setEdit({ i: -1, name: "", phone: "", note: "", rooms: [] })} className="flex w-full items-center gap-2 px-4 py-3 text-left text-[0.9375rem] font-semibold text-acc">
            <Icon name="plus" className="size-5" />
            Otel ekle
          </button>
        </li>
      </ul>
      {!hotels.length && <p className="mt-2 px-1 text-[0.75rem] text-mut">Talimatta otel yoksa ya da başka otelde kalacaksanız elle ekle.</p>}
      {onRooms && hotels.length > 0 && !hotels.some((h) => cleanRooms(h.rooms).length) && (
        <button type="button" disabled={roomsBusy} onClick={onRooms} className="mt-2 w-full rounded-xl px-4 py-2.5 text-left text-[0.8125rem] font-semibold text-acc ring-1 ring-line disabled:opacity-50">
          {roomsBusy ? "Talimat yeniden okunuyor…" : "Oda fiyatlarını talimattan yeniden oku"}
        </button>
      )}

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.i < 0 ? "Otel ekle" : "Otel"}>
        {edit && (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[0.75rem] font-semibold text-mut">Otel adı</span>
              <input value={edit.name} onChange={put("name")} placeholder="Ör. Foça Otel" className={input} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[0.75rem] font-semibold text-mut">Telefon</span>
              <input type="tel" inputMode="tel" value={edit.phone} onChange={put("phone")} placeholder="0232 …" className={input} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[0.75rem] font-semibold text-mut">Not</span>
              <input value={edit.note} onChange={put("note")} placeholder="İndirim kodu, pansiyon, rezervasyon yolu" className={input} />
            </label>
            <div className="flex gap-2 pt-1">
              {edit.i >= 0 && (
                <button type="button" onClick={drop} className="h-12 rounded-xl px-4 text-[0.9375rem] font-semibold text-rec ring-1 ring-line">
                  Sil
                </button>
              )}
              <button type="button" disabled={!edit.name.trim()} onClick={save} className="h-12 flex-1 rounded-xl bg-acc text-[0.9375rem] font-semibold text-white disabled:opacity-50">
                Kaydet
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}

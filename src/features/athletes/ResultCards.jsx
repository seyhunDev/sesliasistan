"use client";

// Sporcularımızın sonucu tek ortak parça; yarış sayfasının üstü (sitesi bağlı değilse) ve Takip › Sonuçlar. Renkli yuvarlaklar (Seyhun 2026-11-09
// "çok fazla yazı oluyor; küçük yuvarlak renklerle gösterelim, hangi yarış hangi renkli; fazla yarış olabilir; yazılar birbirine girmesin";
// örnek /mnt/project-files/yaris-tasarim/sade/sonuc-renk-yakin.png onaylı): solda sıra, altında /kişi (3 haneli sıra adla çakışmaz); ortada ad ve
// dünden fark, altında her yarış o yarışın grubunun renginde yuvarlak, içinde puan (F sütunu final grubu, diğerleri renk grubu); atılan boş
// halka, ceza kırmızı; çok yarışta alt satıra geçer. Sağda NET. Biçim globals.css .rs-*. Veri: resultSheet raceCells (değişmedi).
import { useRef, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { Icon } from "@/components/ui/Icon";
import { groupColor } from "@/lib/roundScore";
import { raceCells } from "@/lib/resultSheet";

// Sonuç ekle "+" (Seyhun 2026-11-09 "sonuçları gösterdiğimiz her yerde tasarımı bozmayacak bir artı; artıyla sonuç ekleyeceğiz"): başlığın
// sağında küçük yuvarlak; PDF ya da fotoğraf seçilir, onFile (yarış sayfası importFile: resultsImport + kayıt) işler. Tek ortak parça.
export function ResultsAdd({ onFile, className = "" }) {
  const toast = useToast();
  const pick = useRef(null);
  const [busy, setBusy] = useState(false);
  if (!onFile) return null;
  const run = async (f) => {
    if (!f || busy) return;
    setBusy(true);
    try {
      const r = await onFile(f);
      toast(r?.note || "Sonuçlar eklendi");
    } catch (e) {
      toast(e?.message || "Sonuçlar okunamadı");
    }
    setBusy(false);
  };
  return (
    <>
      <button type="button" onClick={() => pick.current?.click()} disabled={busy} aria-label={busy ? "Sonuç okunuyor" : "Sonuç ekle"} title="Sonuç ekle" data-press className={`rs-add ${busy ? "rs-busy" : ""} ${className}`}>
        <Icon name="plus" className="size-4" />
      </button>
      <input ref={pick} type="file" accept="application/pdf,image/*,.pdf" hidden onChange={(e) => (run(e.target.files?.[0]), (e.target.value = ""))} />
    </>
  );
}

// Sade liste (Seyhun 2026-11-11 "karman çorman, sadeleştir; tek tek dereceleri de gösterelim"; örnek sp-telefon/ipad.png "Yap"): her sporcu
// tek satır: solda büyük sıra (altında /kişi), ortada ad + dünden fark, altında grup (renkli nokta + ad); dereceler düz sayı (atılan parantezde
// soluk, ceza kırmızı); sağda NET. Dar yerde dereceler grubun yanında, geniş yerde (iPad) sütun sütun (1 2 3 …) — iki yerde çizilir, CSS
// kapsayıcı genişliğine göre birini gösterir (.rs-list container). title: alt bölüm (KIZLAR); sütun başlığı tekrar etmez.
// groups: { sporcu id: [[gün etiketi, grup]] } (RaceTrack.ourGroups; yarın açıklanınca yalnız yarın). rest: sonucu olmayan sporcular [{id, name}].
export function ResultCards({ list, short = false, className = "", groups = null, rest = [], title = "" }) {
  if (!list?.length && !rest?.length) return null;
  const gOf = (id) => groups?.[id]?.[0] || null;
  const rows = (list || []).map((x) => ({ x, cells: short ? [] : raceCells(x.row || {}) }));
  const n = Math.max(0, ...rows.map((r) => r.cells.length));
  const Grp = ({ id }) => {
    const g = gOf(id);
    return g ? (
      <span className="rs-grp" style={{ "--g": groupColor(g[1]) || "var(--mut)" }}>
        {g[1]}
      </span>
    ) : null;
  };
  const Nums = ({ cells, col }) => (
    <span className={col ? "rs-rc" : "rs-ri"}>
      {(col ? Array.from({ length: n }, (_, i) => cells[i] || null) : cells).map((c, i) =>
        c ? (
          <i key={i} className={c.pen ? "rs-pen" : c.drop ? "rs-drop" : c.empty ? "rs-empty" : ""} title={[c.head, c.drop && "atıldı"].filter(Boolean).join(" · ")}>
            {c.drop ? `(${c.val})` : c.val}
          </i>
        ) : (
          <i key={i} />
        ),
      )}
    </span>
  );
  return (
    <div className={`rs-list ${className}`}>
      {title ? (
        <h4 className="rs-sec">{title}</h4>
      ) : (
        <div className="rs-cols" aria-hidden="true">
          <span>SIRA</span>
          <span>SPORCU</span>
          {n > 0 && (
            <span className="rs-rc">
              {Array.from({ length: n }, (_, i) => (
                <i key={i}>{i + 1}</i>
              ))}
            </span>
          )}
          <span>NET</span>
        </div>
      )}
      {rows.map(({ x, cells }) => {
        const row = x.row || {};
        const net = row.pts !== undefined && row.pts !== "" ? row.pts : null;
        return (
          <div key={x.id} className="rs-row">
            <span className="rs-pl">
              <b>{x.place}</b>
              {row.n ? <small>/{row.n}</small> : null}
            </span>
            <span className="rs-mid">
              <span className="rs-nm">
                <span>{x.name}</span>
                {x.move ? <span className={x.move > 0 ? "rs-up" : "rs-dn"}>{x.move > 0 ? `↑${x.move}` : `↓${-x.move}`}</span> : null}
              </span>
              {(gOf(x.id) || cells.length > 0) && (
                <span className="rs-sub">
                  <Grp id={x.id} />
                  {cells.length > 0 && <Nums cells={cells} />}
                </span>
              )}
            </span>
            {n > 0 && <Nums cells={cells} col />}
            <span className="rs-net">{net}</span>
          </div>
        );
      })}
      {rest.map((a) => (
        <div key={a.id} className="rs-row rs-none">
          <span className="rs-pl">
            <b>–</b>
          </span>
          <span className="rs-mid">
            <span className="rs-nm">
              <span>{a.name}</span>
            </span>
            {gOf(a.id) && (
              <span className="rs-sub">
                <Grp id={a.id} />
              </span>
            )}
          </span>
          {n > 0 && <span className="rs-rc" />}
          <span className="rs-net" />
        </div>
      ))}
    </div>
  );
}

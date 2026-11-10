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

// Açık renkli grupta (Sarı, Altın, Gümüş) yuvarlağın yazısı koyu
const LIGHT = new Set(["Sarı", "Altın", "Gümüş"]);

// Gün etiketi → sütun başlığı ("" bugün, "Yarın", kısa tarih)
const dayHead = (d) => (d ? d.toLocaleUpperCase("tr-TR") : "BUGÜN");

// Düz liste (Seyhun 2026-11-09 "iki grup ismi gösteriliyor, minimal ve liste olarak hazırla"; örnek artifact liste-telefon.png): başlık satırı
// SIRA · SPORCU · grup günü · NET; her sporcu tek satır: sıra, ad + dünden fark, altında yarış yuvarlakları; sağda tek grup (renkli nokta + ad),
// NET. title: alt bölüm adı (Kızlar; sütun başlığı yok). groups: { sporcu id: [[gün etiketi, grup]] } (RaceTrack.ourGroups; yarın açıklanınca yalnız yarın). rest: sonucu olmayan sporcular [{id, name}].
export function ResultCards({ list, short = false, className = "", groups = null, rest = [], title = "" }) {
  if (!list?.length && !rest?.length) return null;
  const gOf = (id) => groups?.[id]?.[0] || null;
  const day = groups ? Object.values(groups).find((l) => l?.length)?.[0]?.[0] : undefined;
  const head = day !== undefined;
  const Grp = ({ id }) => {
    const x = gOf(id);
    return head ? <span className="rs-grp" style={{ "--g": (x && groupColor(x[1])) || "var(--mut)" }}>{x ? x[1] : ""}</span> : null;
  };
  return (
    <div className={`rs-list ${head ? "rs-head" : ""} ${className}`}>
      {/* title: alt bölüm (KIZLAR); sütun başlığı tekrar etmez */}
      {title && <h4 className="rs-sec">{title}</h4>}
      {head && !title && (
        <div className="rs-cols" aria-hidden="true">
          <span>SIRA</span>
          <span>SPORCU</span>
          <span>{dayHead(day)}</span>
          <span>NET</span>
        </div>
      )}
      {(list || []).map((x) => {
        const row = x.row || {};
        const cells = short ? [] : raceCells(row);
        const net = row.pts !== undefined && row.pts !== "" ? row.pts : null;
        // yarışın grubu: final sütunu (F1…) final grubu, diğerleri renk grubu; sütun adı yoksa son bilinen grup
        const grpOf = (h) => (/^F\d/.test(String(h || "")) ? row.fl || row.grp : row.grp || row.fl) || "";
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
              {cells.length > 0 && (
                <span className="rs-rs">
                  {cells.map((c) => {
                    const g = grpOf(c.head);
                    // Siyah bayrak (BFD) simsiyah, UFD beyaz (Seyhun 2026-11-09 "öbür grup renkleriyle karışıyor"); diğer cezalar kırmızı
                    const flag = !c.pen ? "" : /^BF/i.test(c.val) ? " rs-bfd" : /^UF/i.test(c.val) ? " rs-ufd" : "";
                    const cls = (c.drop ? "rs-drop" : c.pen ? "rs-pen" : c.empty ? "rs-empty" : LIGHT.has(g) ? "rs-lt" : "") + flag;
                    return (
                      <i key={c.k} className={cls} style={{ "--g": groupColor(g) || "var(--mut)" }} title={[c.head, g, c.drop && "atıldı"].filter(Boolean).join(" · ")}>
                        {c.val}
                      </i>
                    );
                  })}
                </span>
              )}
            </span>
            <Grp id={x.id} />
            {(net !== null || head) && (
              <span className="rs-net">
                {net}
                {!head && <small>NET</small>}
              </span>
            )}
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
          </span>
          <Grp id={a.id} />
          {head && <span className="rs-net" />}
        </div>
      ))}
    </div>
  );
}

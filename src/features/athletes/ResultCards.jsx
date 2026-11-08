"use client";

// Sporcularımızın sonucu tek ortak parça (Seyhun 2026-11-08 "modern profesyonel", örnek 2 onaylı:
// /mnt/project-files/sonuc-tasarim/ornek2-telefon.png). Yarış sayfasının üstü ve Takip › Sonuçlar aynı görünür.
// Satır: renk grubu çizgisi, büyük sıra /kişi, ad, grup etiketi, NET puan; altında yarış yarış kareler
// (atılan yarış kesik çerçeve, ceza kırmızı, en iyi yarış grup renginde). Biçim globals.css .rs-*.
import { groupColor } from "@/lib/roundScore";
import { raceCells } from "@/lib/resultSheet";

function metaOf(x) {
  return [x.fl && x.grp && x.fp && `${x.grp} ${x.fp}.`, !x.fl && x.grp && x.fp && `${x.fp}.`, x.cp && `${x.cat} ${x.cp}.`, x.gp && `Kızlar ${x.gp}.`].filter(Boolean).join(" · ");
}

export function ResultCards({ list, short = false, className = "" }) {
  if (!list?.length) return null;
  return (
    <div className={`rs-list ${className}`}>
      {list.map((x) => {
        const row = x.row || {};
        const tag = row.fl || row.grp || "";
        const g = groupColor(tag) || "var(--mut)";
        const cells = short ? [] : raceCells(row);
        const meta = short ? "" : metaOf(row);
        const net = row.pts !== undefined && row.pts !== "" ? row.pts : null;
        return (
          <div key={x.id} className="rs-ath" style={{ "--g": g }}>
            <div className="rs-top">
              <b className="rs-pl">
                {x.place}
                {row.n ? <sup>/{row.n}</sup> : null}
              </b>
              <span className="rs-mid">
                <span className="rs-nm">{x.name}</span>
                {(tag || meta || x.move) && (
                  <span className="rs-meta">
                    {tag && <span className="rs-tag">{tag}</span>}
                    {meta && <span className="rs-sub">{meta}</span>}
                    {x.move ? <span className={x.move > 0 ? "rs-up" : "rs-dn"}>{x.move > 0 ? `↑${x.move}` : `↓${-x.move}`}</span> : null}
                  </span>
                )}
              </span>
              {net !== null && (
                <span className="rs-net">
                  <b>{net}</b>
                  <small>NET</small>
                </span>
              )}
            </div>
            {cells.length > 0 && (
              <div className="rs-grid" style={{ "--n": Math.min(cells.length, 6) }}>
                {cells.map((c) => (
                  <span key={c.k} className={`rs-c${c.best ? " rs-best" : ""}${c.drop ? " rs-drop" : ""}${c.pen ? " rs-pen" : ""}${c.empty ? " rs-empty" : ""}`}>
                    <b>{c.val}</b>
                    <i>{c.head}</i>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

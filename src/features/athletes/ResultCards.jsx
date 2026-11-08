"use client";

// Sporcularımızın sonucu tek ortak parça; yarış sayfasının üstü (sitesi bağlı değilse) ve Takip › Sonuçlar. Liste görünümü (Seyhun 2026-11-08
// "daha az minimal, liste gibi olsun"; örnek /mnt/project-files/yaris-tasarim/sade/sonuc-liste-telefon.png onaylı): sporcu başına bir satır;
// solda sıra /kişi, ortada grup renginde nokta, ad, dünden fark; altında grup ve kategori sırası, onun altında yarış yarış puan
// (en iyi koyu, atılan parantezde gri, ceza kırmızı); sağda NET. Biçim globals.css .rs-*. Veri: resultSheet raceCells (değişmedi).
import { groupColor } from "@/lib/roundScore";
import { raceCells } from "@/lib/resultSheet";

// "Sarı 2. · Junior 2. · Kızlar 3."; final grubunda "Altın · Sarı 5." (fl: final grubu, grp: renk grubu)
function metaOf(x) {
  const g = x.fl ? [x.fl, x.grp && x.fp && `${x.grp} ${x.fp}.`] : [x.grp && (x.fp ? `${x.grp} ${x.fp}.` : x.grp)];
  return [...g, x.cp && `${x.cat} ${x.cp}.`, x.gp && `Kızlar ${x.gp}.`].filter(Boolean).join(" · ");
}

export function ResultCards({ list, short = false, className = "" }) {
  if (!list?.length) return null;
  return (
    <div className={`rs-list ${className}`}>
      {list.map((x) => {
        const row = x.row || {};
        const g = groupColor(row.fl || row.grp || "") || "var(--mut)";
        const cells = short ? [] : raceCells(row);
        const meta = metaOf(row);
        const net = row.pts !== undefined && row.pts !== "" ? row.pts : null;
        return (
          <div key={x.id} className="rs-row" style={{ "--g": g }}>
            <b className="rs-pl">
              {x.place}
              {row.n ? <sup>/{row.n}</sup> : null}
            </b>
            <span className="rs-mid">
              <span className="rs-nm">
                <i aria-hidden="true" />
                <span>{x.name}</span>
                {x.move ? <span className={x.move > 0 ? "rs-up" : "rs-dn"}>{x.move > 0 ? `↑${x.move}` : `↓${-x.move}`}</span> : null}
              </span>
              {meta && <span className="rs-sub">{meta}</span>}
              {cells.length > 0 && (
                <span className="rs-rs">
                  {cells.map((c) => (
                    <span key={c.k} className={c.best ? "rs-best" : c.drop ? "rs-drop" : c.pen ? "rs-pen" : c.empty ? "rs-empty" : ""}>
                      <i>{c.head}</i>
                      {c.drop ? `(${c.val})` : c.val}
                    </span>
                  ))}
                </span>
              )}
            </span>
            {net !== null && (
              <span className="rs-net">
                {net}
                <small>NET</small>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

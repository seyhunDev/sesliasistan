"use client";

// Sporcularımızın sonucu tek ortak parça; yarış sayfasının üstü (sitesi bağlı değilse) ve Takip › Sonuçlar. Renkli yuvarlaklar (Seyhun 2026-11-09
// "çok fazla yazı oluyor; küçük yuvarlak renklerle gösterelim, hangi yarış hangi renkli; fazla yarış olabilir; yazılar birbirine girmesin";
// örnek /mnt/project-files/yaris-tasarim/sade/sonuc-renk-yakin.png onaylı): solda sıra, altında /kişi (3 haneli sıra adla çakışmaz); ortada ad ve
// dünden fark, altında her yarış o yarışın grubunun renginde yuvarlak, içinde puan (F sütunu final grubu, diğerleri renk grubu); atılan boş
// halka, ceza kırmızı; çok yarışta alt satıra geçer. Sağda NET. Biçim globals.css .rs-*. Veri: resultSheet raceCells (değişmedi).
import { groupColor } from "@/lib/roundScore";
import { raceCells } from "@/lib/resultSheet";

// Açık renkli grupta (Sarı, Altın, Gümüş) yuvarlağın yazısı koyu
const LIGHT = new Set(["Sarı", "Altın", "Gümüş"]);

export function ResultCards({ list, short = false, className = "" }) {
  if (!list?.length) return null;
  return (
    <div className={`rs-list ${className}`}>
      {list.map((x) => {
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
                      <i key={c.k} className={cls} style={{ "--g": groupColor(g) || "var(--mut)" }} title={[c.head, g].filter(Boolean).join(" · ")}>
                        {c.val}
                      </i>
                    );
                  })}
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

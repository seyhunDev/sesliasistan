"use client";

import { Icon } from "@/components/ui/Icon";
import { Empty, card } from "@/components/ui/Page";
import { kindOf } from "./postModel";

const when = (ms) => (ms ? new Date(ms).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "");

// Kaydedilen gönderiler: küçük görsel, başlık, tür · tarih. Köşedeki düğme: listede arşive kaldır, arşivde geri al
export function PostList({ posts, onOpen, onArchive, archive = false }) {
  if (!posts.length && archive) return <Empty icon="archive" title="Arşiv boş" sub="Kullandığın gönderileri listede köşedeki düğmeyle arşive kaldırabilirsin; burada durur, istersen geri alırsın." />;
  if (!posts.length)
    return (
      <Empty
        icon="camera"
        title="Henüz gönderi yok"
        sub="Yarış, sonuç ya da antrenman için Instagram gönderisi hazırla: fotoğrafını seç, ne olduğunu anlat; görsel yazıları ve açıklama yapay zekayla gelsin."
      />
    );
  return (
    <ul className="mt-4 grid grid-cols-2 gap-3">
      {posts.map((p) => (
        <li key={p.id} className="relative">
          <button type="button" onClick={() => onOpen(p)} className={`${card} block w-full overflow-hidden text-left transition active:scale-[.98]`}>
            {p.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.thumb} alt="" className={`block w-full object-cover ${p.format === "portrait" ? "aspect-[4/5]" : p.format === "story" || p.format === "reels" ? "aspect-[9/16]" : "aspect-square"}`} />
            ) : (
              <span className="grid aspect-square w-full place-items-center bg-acc/10 text-acc">
                <Icon name="image" className="size-8" />
              </span>
            )}
            <span className="block px-3 py-2.5">
              <b className="block truncate text-[0.875rem] font-semibold">{p.headline.replace(/\n/g, " ") || p.race?.name || "Adsız gönderi"}</b>
              <span className="block truncate text-[0.75rem] text-mut">{[kindOf(p.kind)[1], when(p.at)].filter(Boolean).join(" · ")}</span>
            </span>
          </button>
          {onArchive && (
            <button type="button" onClick={() => onArchive(p)} aria-label={archive ? "Arşivden çıkar" : "Arşive kaldır"} className="absolute right-2 top-2 flex h-8 items-center gap-1 rounded-full bg-black/55 px-2.5 text-[0.6875rem] font-semibold text-white backdrop-blur active:scale-95">
              <Icon name={archive ? "back" : "archive"} className="size-4" />
              {archive ? "Geri al" : "Arşivle"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

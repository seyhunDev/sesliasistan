"use client";

import { Icon } from "@/components/ui/Icon";
import { Empty, card } from "@/components/ui/Page";
import { kindOf } from "./postModel";

const when = (ms) => (ms ? new Date(ms).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "");

// Kaydedilen gönderiler: küçük görsel, başlık, tür · tarih
export function PostList({ posts, onOpen }) {
  if (!posts.length)
    return (
      <Empty
        icon="camera"
        title="Henüz gönderi yok"
        sub="Yarış duyurusu, sonuç ya da antrenman için Instagram gönderisi hazırla: fotoğrafını seç, ne olduğunu anlat; görsel yazıları ve açıklama yapay zekayla gelsin."
      />
    );
  return (
    <ul className="mt-4 grid grid-cols-2 gap-3">
      {posts.map((p) => (
        <li key={p.id}>
          <button type="button" onClick={() => onOpen(p)} className={`${card} block w-full overflow-hidden text-left transition active:scale-[.98]`}>
            {p.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.thumb} alt="" className={`block w-full object-cover ${p.format === "portrait" ? "aspect-[4/5]" : p.format === "story" ? "aspect-[9/16]" : "aspect-square"}`} />
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
        </li>
      ))}
    </ul>
  );
}

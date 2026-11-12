"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { BackButton } from "@/components/ui/BackButton";
import { ListHead } from "@/components/ui/Row";
import { Loading } from "@/components/ui/Loader";
import { useAuth } from "@/features/auth/AuthProvider";
import { PostList } from "@/features/posts/PostList";
import { archivePost, loadPosts, postsNow } from "@/features/posts/posts";
import { useToast } from "@/components/ui/ToastProvider";
import { saveSum } from "@/lib/homeTiles";

// Instagram gönderileri (yeni tasarım, 2026-11-03): görsel + açıklama hazırla, kaydet, paylaş (yalnız ana hesap)
export default function PostsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const owner = !!profile && profile.role !== "staff";
  useEffect(() => {
    if (profile && !owner) router.replace("/");
  }, [profile, owner, router]);
  if (!owner || !profile?.orgId) return null;
  return <Posts orgId={profile.orgId} />;
}

function Posts({ orgId }) {
  const router = useRouter();
  const [posts, setPosts] = useState(() => postsNow(orgId)); // bellekte varsa hemen, arkada tazelenir
  const [error, setError] = useState("");
  const [tab, setTab] = useState("live");
  const toast = useToast();
  // Ana sayfadaki Instagram alanı için kısa özet bu cihazda (ek okuma yok); arşivdekiler sayılmaz. Son üç gönderinin küçük görseli (thumb, ~15 KB) alanda görünür
  const sum = (list) => {
    const live = list.filter((p) => !p.archived);
    const recent = live.slice(0, 3).filter((p) => p.thumb).map((p) => ({ id: p.id, thumb: p.thumb }));
    saveSum("posts", { count: live.length, recent, last: live[0] ? { id: live[0].id, title: live[0].headline || live[0].topic.slice(0, 40), at: live[0].at, thumb: live[0].thumb || "" } : null });
  };
  useEffect(() => {
    loadPosts(orgId).then(
      (list) => {
        setPosts(list);
        sum(list);
      },
      (e) => (setPosts((l) => l || []), setError(e?.message || "Gönderiler alınamadı.")),
    );
  }, [orgId]);

  const live = posts?.filter((p) => !p.archived) || [];
  const old = posts?.filter((p) => p.archived) || [];
  // Köşedeki düğme: hemen listeden çıkar, yazılamazsa geri gelir
  const flip = async (p) => {
    const next = posts.map((x) => (x.id === p.id ? { ...x, archived: !p.archived } : x));
    setPosts(next);
    sum(next);
    try {
      await archivePost(orgId, p.id, !p.archived);
      toast(p.archived ? "Arşivden çıkarıldı" : "Arşive kaldırıldı");
    } catch {
      setPosts(posts);
      sum(posts);
      toast(p.archived ? "Arşivden çıkarılamadı" : "Arşive kaldırılamadı");
    }
  };

  // Yeni tasarım (2026-11-03): lacivert üstte ad, sayı, "+ Gönderi" ve Gönderiler · Arşiv; altta gönderi ızgarası
  const pill0 = "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[0.8125rem] font-semibold";
  const shown = tab === "old" ? old : live;
  return (
    <main className="split mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Instagram">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Instagram</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{posts ? (live.length ? `${live.length} gönderi` : "Gönderi yok") : "Yükleniyor…"}</p>
          </div>
          <Link href="/posts/new" data-press className="btn btn-primary btn-sm shrink-0 gap-1">
            <Icon name="plus" className="size-4" />
            Gönderi
          </Link>
        </header>
        {posts && (old.length > 0 || tab === "old") && (
          <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
            {[
              ["live", "Gönderiler", live.length],
              ["old", "Arşiv", old.length],
            ].map(([k, l, c]) => (
              <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k} data-press className={`${pill0} ${tab === k ? "border-white bg-white text-deep" : "ck-glass text-white"}`}>
                {l}
                <span className="ml-1.5 tabular-nums opacity-70">{c}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="split-cols relative -mx-5 -mt-6 min-h-[50vh] rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {error && <p className="mb-3 text-center text-[0.875rem] text-rec">{error}</p>}
        {!posts ? (
          <Loading label="Gönderiler yükleniyor" />
        ) : (
          <section>
            {shown.length > 0 && <ListHead title={tab === "old" ? "Arşiv" : "Gönderiler"} count={shown.length} />}
            <PostList posts={shown} archive={tab === "old"} onArchive={flip} onOpen={(p) => router.push(`/posts/${p.id}`)} />
          </section>
        )}
      </div>
    </main>
  );
}

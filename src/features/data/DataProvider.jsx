"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { collection, deleteField, doc, getDoc, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { Splash } from "@/components/ui/Splash";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/features/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { calcTotals, mismatch } from "@/lib/receipts";
import { isNewFor, lockedFor, peopleFor, unseenNotes } from "@/lib/people";
import { loadQuota } from "@/lib/quota";
import { badgeCount } from "@/lib/badge";

// Bu alanlardan biri değişince kayıttaki kişilere "değişti" bildirimi gider
const CHANGE_KEYS = ["title", "date", "endDate", "time", "allDay", "place", "due", "body"];

// Veri: orgs/{işletme}/plans | tasks | notes | receipts (+ receiptImages, members). İşletme = ana hesabın uid'si.
// Her kayıtta createdByUid (ekleyen), assignees (sorumlu çalışanlar; boş = genel) ve people (görebilenler: ekleyen + sorumlular) bulunur.
// Ana hesap işletmenin tamamını, çalışan yalnızca people listesinde kendisi olan kayıtları okur (Firestore kuralları da bunu uygular).
const KEYS = { plan: "plans", task: "tasks", note: "notes", receipt: "receipts", birthday: "birthdays", lesson: "lessons" };
const COLS = Object.values(KEYS);
const EMPTY = { plans: [], tasks: [], notes: [], receipts: [], birthdays: [], lessons: [] };
const NAMES = { plan: "Plan", task: "Görev", note: "Not", receipt: "Fiş", birthday: "Doğum günü", lesson: "Ders" };
// Kişiye özel kayıtlar: çalışan da kendi eklediğini onaysız siler (Firestore kuralları da izin verir)
const PERSONAL = ["birthday", "lesson"];
const UNDO_MS = 5000; // silme bu süre boyunca geri alınabilir
const SEEN_MS = 4 * 60e3; // çalışanın "son görülme" bilgisi bu aralıkla güncellenir
const Ctx = createContext(null);

const tzName = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Istanbul";
  } catch {
    return "Europe/Istanbul";
  }
};

// Fiş taslağını kaydedilecek biçime çevirir (toplamlar her zaman kalemlerden yeniden hesaplanır)
function receiptBody(d) {
  const items = (d.items || []).map((i) => ({ n: String(i.n || "").trim() || "Kalem", q: Number(i.q) || 1, u: Math.round(i.u || 0), r: Number(i.r) || 0 }));
  const body = {
    merchant: String(d.merchant || "").trim(),
    taxId: d.taxId || "",
    address: d.address || "",
    docType: d.docType || "fis",
    docNo: d.docNo || "",
    date: d.date,
    time: d.time || "",
    items,
    totals: calcTotals(items),
    declared: d.declared > 0 ? d.declared : null,
    declaredVat: d.declaredVat > 0 ? d.declaredVat : null,
    pay: d.pay || "",
    cat: d.cat || "Diğer",
    note: d.note || "",
    conf: d.conf || null,
  };
  // Kullanıcı formu görüp kaydetti: yalnızca toplam uyuşmazlığı "kontrol" durumunda bırakır
  body.status = mismatch(body) ? "review" : "ok";
  return body;
}

export function DataProvider({ children }) {
  const toast = useToast();
  const { profile } = useAuth();
  const uid = profile?.uid ?? null;
  const orgId = profile?.orgId ?? null;
  const staff = profile?.role === "staff";
  const [data, setData] = useState(EMPTY);
  const [members, setMembers] = useState([]); // ana hesabın çalışanları: [{ uid, name, email }]
  const [extraBadge, setExtraBadge] = useState(0); // okunmamış sohbet sayısı (simgedeki sayıya eklenir)
  const [ready, setReady] = useState(false);
  const cur = useRef(data); // geri çağrılarda her zaman güncel veri
  cur.current = data;

  const me = useRef({});
  useEffect(() => {
    me.current = { uid, orgId, staff, name: profile?.name };
  });

  const getOrgId = useCallback(() => {
    const id = me.current.orgId;
    if (!id) throw Object.assign(new Error("Oturum bulunamadı"), { code: "no-auth" });
    return id;
  }, []);
  // Yeni kayıt: ekleyen + sorumlular. Çalışanın eklediği kaydın sorumlusu her zaman kendisidir.
  const owners = (assignees = []) => {
    const list = me.current.staff ? [me.current.uid] : [...new Set(assignees.filter(Boolean))];
    return { createdByUid: me.current.uid, assignees: list, people: peopleFor(me.current.uid, list) };
  };

  // Sorumlulara "sana atandı" bildirimi (sunucu her kişiye bir kez gönderir)
  const notifyAssign = (kind, id) =>
    authFetch("/api/notify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, id }) }).catch(() => {});
  // Kayda not eklendi / kişi tamamladı: kaydı verene ve ana hesaba bildirim (metni sunucu kayıttan okur)
  const notifyEvent = (kind, id, event) =>
    authFetch("/api/notify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, id, event }) }).catch(() => {});

  // Hata olursa kullanıcıya söyle. Ekrandaki iyimser değişikliği canlı dinleyici zaten geri alır.
  const fail = useCallback(
    (e, what) => {
      console.error(`[DataProvider] ${what}:`, e?.code, e?.message);
      toast(
        e?.code === "permission-denied"
          ? "Bu işlem için yetkin yok. Çıkış yapıp tekrar giriş yapmayı dene."
          : e?.code === "no-auth"
            ? "Oturum bulunamadı, tekrar giriş yap."
            : `${what} başarısız, tekrar dene.`,
      );
    },
    [toast],
  );

  // Canlı dinleme: başka cihazdaki değişiklik de anında görünür
  useEffect(() => {
    if (!uid || !orgId) {
      setData(EMPTY);
      setReady(true);
      return;
    }
    setReady(false);
    setData(EMPTY);
    const loaded = new Set();
    const done = (k) => {
      loaded.add(k);
      if (loaded.size === COLS.length) setReady(true);
    };
    const unsubs = COLS.map((k) =>
      onSnapshot(
        staff
          ? query(collection(db, "orgs", orgId, k), where("people", "array-contains", uid))
          : k === "birthdays" || k === "lessons" // doğum günleri ve ders programı kişiye özel: ana hesap da yalnızca kendi eklediklerini görür
            ? query(collection(db, "orgs", orgId, k), where("createdByUid", "==", uid))
            : collection(db, "orgs", orgId, k),
        (snap) => {
          setData((p) => ({ ...p, [k]: snap.docs.map((d) => ({ ...d.data(), id: d.id })) }));
          done(k);
        },
        (err) => {
          console.error(`[DataProvider] ${k} okunamadı:`, err.code, err.message);
          if (err.code === "permission-denied") toast("Verilerine şu an ulaşılamıyor. Çıkış yapıp tekrar giriş yapmayı dene.");
          done(k);
        },
      ),
    );
    const t = setTimeout(() => setReady(true), 3000); // bağlantı yavaşsa ekranı bekletme
    return () => {
      clearTimeout(t);
      unsubs.forEach((u) => u());
    };
  }, [uid, orgId, staff, toast]);

  // Ana hesap: çalışan listesi (isimleri göstermek ve atama için)
  useEffect(() => {
    if (!uid || staff) return;
    return onSnapshot(
      collection(db, "orgs", uid, "members"),
      (snap) => setMembers(snap.docs.map((d) => ({ ...d.data(), uid: d.id }))),
      () => setMembers([]),
    );
  }, [uid, staff]);

  // Çalışan: "son görülme" (ana hesap çalışan listesinde görür). Uygulama açıkken birkaç dakikada bir güncellenir.
  useEffect(() => {
    if (!uid || !orgId || !staff) return;
    let last = 0;
    const ping = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 60e3) return;
      last = Date.now();
      updateDoc(doc(db, "orgs", orgId, "members", uid), { lastSeen: serverTimestamp() }).catch(() => {});
    };
    ping();
    const t = setInterval(ping, SEEN_MS);
    document.addEventListener("visibilitychange", ping);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [uid, orgId, staff]);

  // ---- Plan / görev / not ----
  // Taslak kartları gerçek kayıtlara çevirir. Sonucu hemen döndürür, yazma arka planda biter.
  // Kaydet: yazmanın sunucuya ulaşması beklenir. Sonuç: { plans, tasks, notes } ve
  //   error: yazılamadı (sayılar 0) · queued: bağlantı yok/yavaş, kayıt cihazda sırada (internet gelince gider)
  const saveDrafts = useCallback(
    async (drafts, { source, by }) => {
      let ownerId;
      try {
        ownerId = getOrgId();
      } catch (e) {
        fail(e, "Kaydetme");
        return { plans: 0, tasks: 0, notes: 0 };
      }
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      const newId = (k) => doc(collection(db, "orgs", ownerId, k)).id;
      // Görev ve notlar yalnızca İLK plana bağlanır; her plan kendi kimliğini alır
      const firstPlanIdx = drafts.findIndex((d) => d.type === "plan");
      const planIds = drafts.map((d) => (d.type === "plan" ? newId("plans") : null));
      const pid = firstPlanIdx >= 0 ? planIds[firstPlanIdx] : null;
      const count = { plans: 0, tasks: 0, notes: 0 };
      const toNotify = []; // [tür, kimlik]: sorumlusu olan kayıtlar
      const ids = []; // [tür, kimlik]: taslak sırasıyla (asistan kartındaki Düzenle için)

      drafts.forEach((d, i) => {
        const base = { ownerId, cat: d.cat || "Genel", src: source, createdBy: by, createdAt: now, ...owners(d.assignees) };
        if (d.type === "plan") {
          const timed = !!d.time;
          if (base.assignees.length && !me.current.staff) toNotify.push(["plan", planIds[i]]);
          batch.set(doc(db, "orgs", ownerId, "plans", planIds[i]), {
            ...base,
            title: d.title.trim(),
            date: d.date,
            endDate: d.endDate && d.endDate !== d.date ? d.endDate : "", // dahil (son gün)
            time: timed ? d.time : "",
            allDay: !timed,
            durationMin: timed ? 60 : null,
            tz: tzName(),
            timeSource: timed ? "user" : "none",
            place: (d.place || "").trim(),
            status: "planned",
          });
          ids.push(["plan", planIds[i]]);
          count.plans++;
        } else {
          const planId = d.link && pid ? pid : null;
          if (d.type === "task") {
            const tid = newId("tasks");
            if (base.assignees.length && !me.current.staff) toNotify.push(["task", tid]);
            batch.set(doc(db, "orgs", ownerId, "tasks", tid), { ...base, title: d.title.trim(), due: d.date || null, done: false, doneAt: null, planId });
            ids.push(["task", tid]);
            count.tasks++;
          } else {
            const nid = newId("notes");
            if (base.assignees.length && !me.current.staff) toNotify.push(["note", nid]);
            batch.set(doc(db, "orgs", ownerId, "notes", nid), {
              ...base,
              title: (d.title || d.body).trim(),
              body: (d.body || d.title).trim(),
              tags: [],
              planId,
            });
            ids.push(["note", nid]);
            count.notes++;
          }
        }
      });

      const done = batch
        .commit()
        .then(() => {
          toNotify.forEach(([k, id]) => notifyAssign(k, id));
          return "ok";
        })
        .catch((e) => {
          fail(e, "Kaydetme");
          return "err";
        });
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      const st = await Promise.race([done, new Promise((r) => setTimeout(() => r("slow"), offline ? 300 : 8000))]);
      if (st === "err") return { plans: 0, tasks: 0, notes: 0, error: true };
      return { ...count, ids, queued: st === "slow" };
    },
    [getOrgId, fail],
  );

  // Başkasının eklediği kayıt (çalışan için): değiştirilemez, silinemez
  const isLocked = useCallback((kind, id) => {
    const rec = cur.current[KEYS[kind]]?.find((x) => x.id === id);
    return lockedFor(rec, me.current.uid, me.current.staff);
  }, []);
  const lockedMsg = useCallback(() => toast("Bu kaydı yalnızca ekleyen değiştirebilir. Tamamladım diyebilir ya da mesaj yazabilirsin."), [toast]);

  // Atanan kişi: yalnızca kendisi için tamamlandı (doneBy.{uid})
  const setMyDone = useCallback(
    async (kind, id, on) => {
      const k = KEYS[kind];
      const u = me.current.uid;
      const now = new Date().toISOString();
      setData((p) => ({ ...p, [k]: p[k].map((x) => (x.id === id ? { ...x, doneBy: { ...(x.doneBy || {}), [u]: on ? now : undefined } } : x)) }));
      try {
        await updateDoc(doc(db, "orgs", getOrgId(), k, id), { [`doneBy.${u}`]: on ? now : deleteField() });
        if (on) notifyEvent(kind, id, "done");
      } catch (e) {
        fail(e, "Güncelleme");
      }
    },
    [getOrgId, fail],
  );

  // Kayda mesaj yazar (replies.{uid} listesine): atanan kişi ya da ana hesap. İlgililere bildirim gider.
  const addReply = useCallback(
    async (kind, id, text) => {
      const t = String(text || "").trim().slice(0, 1000);
      if (!t) return;
      const k = KEYS[kind];
      const u = me.current.uid;
      const rec = cur.current[k]?.find((x) => x.id === id);
      if (!rec) return;
      const list = [...(rec.replies?.[u] || []), { at: new Date().toISOString(), text: t }].slice(-50);
      setData((p) => ({ ...p, [k]: p[k].map((x) => (x.id === id ? { ...x, replies: { ...(x.replies || {}), [u]: list } } : x)) }));
      try {
        await updateDoc(doc(db, "orgs", getOrgId(), k, id), { [`replies.${u}`]: list });
        notifyEvent(kind, id, "reply");
      } catch (e) {
        fail(e, "Mesaj gönderme");
      }
    },
    [getOrgId, fail],
  );

  const toggleTask = useCallback(
    async (id) => {
      const target = cur.current.tasks.find((t) => t.id === id);
      if (!target) return;
      if (lockedFor(target, me.current.uid, me.current.staff)) return setMyDone("task", id, !target.doneBy?.[me.current.uid]);
      const done = !target.done;
      const doneAt = done ? new Date().toISOString() : null;
      setData((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === id ? { ...t, done, doneAt } : t)) }));
      try {
        await updateDoc(doc(db, "orgs", getOrgId(), "tasks", id), { done, doneAt });
      } catch (e) {
        fail(e, "Görev güncelleme");
      }
    },
    [getOrgId, fail, setMyDone],
  );

  const updateRecord = useCallback(
    async (kind, id, patch, by) => {
      if (isLocked(kind, id)) return lockedMsg();
      const k = KEYS[kind];
      const { assignees, ...rest } = patch;
      const full = { ...rest, updatedAt: new Date().toISOString(), updatedBy: by };
      // Ana hesap sorumluları değiştirdiyse görebilecekler yeniden hesaplanır (ekleyen hep kalır)
      if (Array.isArray(assignees) && !me.current.staff) {
        const rec = cur.current[k].find((x) => x.id === id);
        full.assignees = [...new Set(assignees.filter(Boolean))];
        full.people = peopleFor(rec?.createdByUid || me.current.orgId, full.assignees);
      }
      setData((p) => ({ ...p, [k]: p[k].map((x) => (x.id === id ? { ...x, ...full } : x)) }));
      try {
        await updateDoc(doc(db, "orgs", getOrgId(), k, id), full);
        if (full.assignees?.length && ["plan", "task", "note"].includes(kind)) notifyAssign(kind, id); // yeni eklenen sorumlulara
        // Zaman, yer, başlık ya da metin değiştiyse kayıttaki diğer kişilere "değişti" bildirimi (sunucu kayıttan okur)
        if (["plan", "task", "note"].includes(kind) && Object.keys(rest).some((x) => CHANGE_KEYS.includes(x))) notifyEvent(kind, id, "changed");
      } catch (e) {
        fail(e, "Güncelleme");
      }
    },
    [getOrgId, fail, isLocked, lockedMsg],
  );

  // Çalışan silemez: kendi eklediği kayıt için silme isteği gönderir (deleteReq), ana hesap onaylarsa silinir.
  // Başkasının kaydı için istek de gönderilemez (değiştiremediği kayıt).
  const requestDelete = useCallback(
    async (kind, id, undo = true) => {
      const k = KEYS[kind];
      const rec = cur.current[k]?.find((x) => x.id === id);
      const u = me.current.uid;
      if (!rec || !u) return;
      if (rec.createdByUid && rec.createdByUid !== u) return toast("Bu kaydı yalnızca ekleyen değiştirebilir.");
      if (rec.deleteReq) return toast("Silme isteği zaten ana hesapta bekliyor.");
      try {
        await updateDoc(doc(db, "orgs", getOrgId(), k, id), { deleteReq: { by: u, at: new Date().toISOString() } });
        notifyEvent(kind, id, "deleteReq");
        toast(
          "Silme isteği ana hesaba gönderildi",
          undo
            ? { duration: UNDO_MS, action: { label: "Geri al", onClick: () => updateDoc(doc(db, "orgs", getOrgId(), k, id), { deleteReq: deleteField() }).catch(() => {}) } }
            : undefined,
        );
      } catch (e) {
        fail(e, "Silme isteği");
      }
    },
    [getOrgId, fail, toast],
  );
  // Ana hesap: çalışanın silme isteğini reddeder (kayıt kalır)
  const rejectDelete = useCallback(
    async (kind, id) => {
      try {
        await updateDoc(doc(db, "orgs", getOrgId(), KEYS[kind], id), { deleteReq: deleteField() });
        toast("Silme isteği reddedildi, kayıt duruyor");
      } catch (e) {
        fail(e, "Reddetme");
      }
    },
    [getOrgId, fail, toast],
  );

  const deleteRecord = useCallback(
    async (kind, id) => {
      if (me.current.staff && !PERSONAL.includes(kind)) return requestDelete(kind, id, false); // çalışan: ana hesabın onayına (doğum günü ve ders kişiye özel, kendisi siler)
      const k = KEYS[kind];
      const { tasks, notes } = cur.current; // silmeden önceki bağlı kayıtlar
      setData((p) => {
        const next = { ...p, [k]: p[k].filter((x) => x.id !== id) };
        if (kind === "plan") {
          next.tasks = next.tasks.map((t) => (t.planId === id ? { ...t, planId: null } : t));
          next.notes = next.notes.map((n) => (n.planId === id ? { ...n, planId: null } : n));
        }
        return next;
      });
      try {
        const ownerId = getOrgId();
        // Kayıtta başka kişiler varsa önce "iptal/kaldırıldı" bildirimi (sunucu kaydı silinmeden okur)
        const gone = ["plan", "task", "note"].includes(kind) && cur.current[k]?.find?.((x) => x.id === id);
        const others = gone ? [...new Set([gone.createdByUid, ...(gone.people || []), ...(gone.assignees || [])])].filter((u) => u && u !== me.current.uid) : [];
        if (others.length) await notifyEvent(kind, id, "deleted");
        const batch = writeBatch(db);
        batch.delete(doc(db, "orgs", ownerId, k, id));
        if (kind === "plan") {
          // Plan silinince bağlı görev ve notlar korunur, yalnızca bağ kopar
          tasks.filter((t) => t.planId === id).forEach((t) => batch.update(doc(db, "orgs", ownerId, "tasks", t.id), { planId: null }));
          notes.filter((n) => n.planId === id).forEach((n) => batch.update(doc(db, "orgs", ownerId, "notes", n.id), { planId: null }));
        }
        if (kind === "receipt") batch.delete(doc(db, "orgs", ownerId, "receiptImages", id));
        await batch.commit(); // ya hepsi ya hiçbiri
      } catch (e) {
        fail(e, "Silme");
      }
    },
    [getOrgId, fail, requestDelete],
  );

  // ---- İletildi / görüldü ----
  // Kayıt açıldı: bu kişi için "görüldü" (iletildi yoksa o da yazılır). updatedAt değişmez.
  const markSeen = useCallback(
    (kind, id) => {
      const k = KEYS[kind];
      const rec = cur.current[k]?.find((x) => x.id === id);
      const u = me.current.uid;
      if (!rec || !u) return;
      const now = new Date().toISOString();
      const patch = {};
      // Başkasının eklediği kayıt ilk kez açıldı: görüldü (ve iletildi)
      if (rec.createdByUid && rec.createdByUid !== u && !rec.ack?.[u]?.r) Object.assign(patch, { [`ack.${u}.r`]: now, ...(rec.ack?.[u]?.d ? {} : { [`ack.${u}.d`]: now }) });
      // Başkalarının yeni mesajları görüldü (ana sayfadaki "Yenilikler" kartından düşer)
      if (unseenNotes(rec, u).length) patch[`ack.${u}.n`] = now;
      if (!Object.keys(patch).length) return;
      try {
        updateDoc(doc(db, "orgs", getOrgId(), k, id), patch).catch(() => {});
      } catch {}
    },
    [getOrgId],
  );

  // Şu an açık olan konuşma ("plan-abc"): sunucu bu kişi o kaydı görürken yeni mesaj için telefona bildirim göndermez.
  // Ekran açıkken 30 sn'de bir tazelenir; sunucu 75 sn'den eski bilgiyi yok sayar (uygulama kapanınca kendiliğinden düşer).
  const setViewing = useCallback((key) => {
    const u = me.current.uid;
    if (!u) return;
    updateDoc(doc(db, "users", u), { viewing: key ? { key, at: new Date().toISOString() } : deleteField() }).catch(() => {});
  }, []);

  // Uygulama açıkken gelen yeni kayıtlar bu kişiye "iletildi" (bildirim kapalı olsa da)
  useEffect(() => {
    if (!uid || !orgId || !ready) return;
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    let n = 0;
    for (const k of ["plans", "tasks", "notes"]) {
      for (const r of data[k]) {
        if (n >= 50 || !isNewFor(r, uid) || r.ack?.[uid]?.d) continue;
        batch.update(doc(db, "orgs", orgId, k, r.id), { [`ack.${uid}.d`]: now });
        n++;
      }
    }
    if (n) batch.commit().catch(() => {});
  }, [data, uid, orgId, ready]);

  // Kişi (çalışan) hesabında günlük hakları sunucudan al (asistan ve fiş geri sayımı için)
  useEffect(() => {
    if (staff && ready) loadQuota(authFetch);
  }, [staff, ready]);

  // Uygulama simgesindeki sayı (iPhone'da ana ekrandaki uygulama, iOS 16.4+): ana sayfadaki "Yenilikler" kartıyla aynı —
  // henüz açılmamış yeni kayıtlar + başkalarının yazdığı görülmemiş notu olan kayıtlar (kayıt başına 1)
  useEffect(() => {
    if (!uid || !ready || typeof navigator === "undefined" || !navigator.setAppBadge) return;
    // Sunucu da her bildirimle aynı kuralla sayar (lib/badge): telefondaki sayı ile "Senin için" tutarlı
    const n = badgeCount({ uid, owner: !staff, plans: data.plans, tasks: data.tasks, notes: data.notes, receipts: data.receipts, unreadChats: extraBadge });
    (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
  }, [data, uid, ready, extraBadge, staff]);

  // ---- Geri alınabilir silme ----
  // Kayıt hemen listeden kalkar, "Geri al" düğmeli bildirim çıkar. Süre dolunca gerçekten silinir.
  // Uygulama arka plana geçerse ya da kapanırsa bekleyen silmeler hemen uygulanır (kayıp olmaz).
  const [hidden, setHidden] = useState(() => new Set());
  const pending = useRef(new Map()); // "tür:id" -> { timer, commit }
  const unhide = (key) =>
    setHidden((h) => {
      const n = new Set(h);
      n.delete(key);
      return n;
    });

  const removeWithUndo = useCallback(
    (kind, id) => {
      if (isLocked(kind, id)) return lockedMsg();
      if (me.current.staff && !PERSONAL.includes(kind)) return requestDelete(kind, id); // çalışan: silme isteği (ana hesap onaylar); doğum günü ve ders kişiye özel, kendisi siler
      const key = `${kind}:${id}`;
      if (pending.current.has(key)) return;
      const commit = () => {
        pending.current.delete(key);
        deleteRecord(kind, id);
        unhide(key);
      };
      const timer = setTimeout(commit, UNDO_MS + 500);
      pending.current.set(key, { timer, commit });
      setHidden((h) => new Set(h).add(key));
      navigator.vibrate?.(10);
      toast(`${NAMES[kind] || "Kayıt"} silindi`, {
        duration: UNDO_MS,
        action: {
          label: "Geri al",
          onClick: () => {
            clearTimeout(timer);
            pending.current.delete(key);
            unhide(key);
          },
        },
      });
    },
    [deleteRecord, toast, isLocked, lockedMsg, requestDelete],
  );

  useEffect(() => {
    const map = pending.current;
    const flush = () =>
      map.forEach((p) => {
        clearTimeout(p.timer);
        p.commit();
      });
    const onVis = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  // Silinmeyi bekleyenler ekranda görünmez
  // Çalışanın gördüğü görev "tamam" durumu: başkasının verdiği görevde kendi tamamlaması (doneBy)
  const view = useMemo(() => {
    const out = {};
    for (const [kind, k] of Object.entries(KEYS)) out[k] = hidden.size ? data[k].filter((x) => !hidden.has(`${kind}:${x.id}`)) : data[k];
    if (staff) out.tasks = out.tasks.map((t) => (lockedFor(t, uid, true) ? { ...t, done: !!t.doneBy?.[uid], doneAt: t.doneBy?.[uid] || null } : t));
    return out;
  }, [data, hidden, staff, uid]);

  // ---- Doğum günleri (her yıl tekrarlanır) ----
  // b: { name, month, day, year|null, memberUid|null, note, phone }. id verilirse günceller.
  const saveBirthday = useCallback(
    (b, id) => {
      let ownerId;
      try {
        ownerId = getOrgId();
      } catch (e) {
        fail(e, "Kaydetme");
        return;
      }
      const body = {
        name: String(b.name || "").trim(),
        month: Number(b.month),
        day: Number(b.day),
        year: b.year ? Number(b.year) : null,
        memberUid: b.memberUid || null,
        note: String(b.note || "").trim(),
        phone: String(b.phone || "").replace(/[^\d+ ]/g, "").trim(),
        ...(b.athleteId ? { athleteId: String(b.athleteId) } : {}), // sporcudan eklendiyse (tekrar önerilmesin)
      };
      const now = new Date().toISOString();
      const p = id
        ? updateDoc(doc(db, "orgs", ownerId, "birthdays", id), { ...body, updatedAt: now })
        : writeBatch(db).set(doc(collection(db, "orgs", ownerId, "birthdays")), { ...body, ownerId, createdAt: now, createdBy: { name: me.current.name || "" }, ...owners() }).commit();
      p.catch((e) => fail(e, "Kaydetme"));
    },
    [getOrgId, fail],
  );

  // ---- Ders programı (her hafta tekrarlanır) ----
  // list: [{ title, day (1=Pzt … 7=Paz), start "HH:MM", end "HH:MM", place, teacher }]
  const saveLessons = useCallback(
    (list, { replace = false } = {}) => {
      let ownerId;
      try {
        ownerId = getOrgId();
      } catch (e) {
        fail(e, "Kaydetme");
        return 0;
      }
      const now = new Date().toISOString();
      const batch = writeBatch(db);
      // replace: bu kişinin önceki programı silinir (yeni fotoğraf/metinle baştan kurulunca)
      if (replace) cur.current.lessons.filter((l) => l.createdByUid === me.current.uid).forEach((l) => batch.delete(doc(db, "orgs", ownerId, "lessons", l.id)));
      list.forEach((l) =>
        batch.set(doc(collection(db, "orgs", ownerId, "lessons")), {
          title: String(l.title || "").trim(),
          day: Number(l.day),
          start: l.start || "",
          end: l.end || "",
          place: String(l.place || "").trim(),
          teacher: String(l.teacher || "").trim(),
          ownerId,
          createdAt: now,
          createdBy: { name: me.current.name || "" },
          ...owners(),
        }),
      );
      batch.commit().catch((e) => fail(e, "Kaydetme"));
      return list.length;
    },
    [getOrgId, fail],
  );

  const updateLesson = useCallback(
    (id, patch) => {
      try {
        updateDoc(doc(db, "orgs", getOrgId(), "lessons", id), { ...patch, updatedAt: new Date().toISOString() }).catch((e) => fail(e, "Güncelleme"));
      } catch (e) {
        fail(e, "Güncelleme");
      }
    },
    [getOrgId, fail],
  );

  // Tüm programı sil: bu kişinin bütün dersleri. Hemen ekrandan kalkar, "Geri al" süresi dolunca silinir.
  const clearLessons = useCallback(() => {
    const ids = cur.current.lessons.filter((l) => l.createdByUid === me.current.uid).map((l) => l.id);
    if (!ids.length) return 0;
    const keys = ids.map((id) => `lesson:${id}`);
    const unhideAll = () =>
      setHidden((h) => {
        const n = new Set(h);
        keys.forEach((k) => n.delete(k));
        return n;
      });
    const commit = async () => {
      pending.current.delete("lessons:all");
      setData((p) => ({ ...p, lessons: p.lessons.filter((l) => !ids.includes(l.id)) }));
      unhideAll();
      try {
        const ownerId = getOrgId();
        for (let i = 0; i < ids.length; i += 400) {
          const batch = writeBatch(db);
          ids.slice(i, i + 400).forEach((id) => batch.delete(doc(db, "orgs", ownerId, "lessons", id)));
          await batch.commit();
        }
      } catch (e) {
        fail(e, "Silme");
      }
    };
    const timer = setTimeout(commit, UNDO_MS + 500);
    pending.current.set("lessons:all", { timer, commit });
    setHidden((h) => new Set([...h, ...keys]));
    navigator.vibrate?.(10);
    toast(`Program silindi (${ids.length} ders)`, {
      duration: UNDO_MS,
      action: {
        label: "Geri al",
        onClick: () => {
          clearTimeout(timer);
          pending.current.delete("lessons:all");
          unhideAll();
        },
      },
    });
    return ids.length;
  }, [getOrgId, fail, toast]);

  // ---- Fişler ----
  // Fotoğraf ayrı belgede tutulur (orgs/{uid}/receiptImages/{id}); liste hafif kalır.
  // image: dataURL | undefined (değişmedi) | null (kaldır)
  const saveReceipt = useCallback(
    (d, { by, image, src }) => {
      let ownerId;
      try {
        ownerId = getOrgId();
      } catch (e) {
        fail(e, "Fiş kaydetme");
        return null;
      }
      const ref = doc(collection(db, "orgs", ownerId, "receipts"));
      const now = new Date().toISOString();
      const batch = writeBatch(db);
      const who = owners();
      // Çalışanın eklediği fiş: ödemesi ana hesaptan bekleniyor
      const payStatus = me.current.staff ? "pending" : null;
      batch.set(ref, { ...receiptBody(d), hasImage: !!image, src: src || (image ? "photo" : "manual"), ownerId, createdBy: by, createdAt: now, ...who, payStatus });
      if (image) batch.set(doc(db, "orgs", ownerId, "receiptImages", ref.id), { data: image, createdAt: now, ...who });
      batch
        .commit()
        .then(() => payStatus === "pending" && authFetch("/api/notify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ receiptId: ref.id, event: "new" }) }).catch(() => {}))
        .catch((e) => fail(e, "Fiş kaydetme"));
      return ref.id;
    },
    [getOrgId, fail],
  );

  const updateReceipt = useCallback(
    (id, d, { by, image }) => {
      let ownerId;
      try {
        ownerId = getOrgId();
      } catch (e) {
        fail(e, "Fiş güncelleme");
        return;
      }
      const now = new Date().toISOString();
      const patch = { ...receiptBody(d), updatedAt: now, updatedBy: by };
      if (image !== undefined) patch.hasImage = !!image;
      setData((p) => ({ ...p, receipts: p.receipts.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      const batch = writeBatch(db);
      batch.update(doc(db, "orgs", ownerId, "receipts", id), patch);
      const imgRef = doc(db, "orgs", ownerId, "receiptImages", id);
      const rec = cur.current.receipts.find((x) => x.id === id);
      const who = rec?.people ? { people: rec.people, createdByUid: rec.createdByUid, ...(rec.assignees ? { assignees: rec.assignees } : {}) } : owners();
      if (image) batch.set(imgRef, { data: image, createdAt: now, ...who });
      else if (image === null) batch.delete(imgRef);
      batch.commit().catch((e) => fail(e, "Fiş güncelleme"));
    },
    [getOrgId, fail],
  );

  // Ana hesap: çalışanın fişini "ödendi" yapar (ya da geri alır); ödendiyse çalışana bildirim gider
  const markPaid = useCallback(
    async (id, paid = true) => {
      const patch = paid
        ? { payStatus: "paid", paidAt: new Date().toISOString(), paidBy: { name: me.current.name || "Ana hesap" }, paySeenAt: null }
        : { payStatus: "pending", paidAt: null, paidBy: null, paySeenAt: null };
      setData((p) => ({ ...p, receipts: p.receipts.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      try {
        await updateDoc(doc(db, "orgs", getOrgId(), "receipts", id), patch);
        if (paid) authFetch("/api/notify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ receiptId: id }) }).catch(() => {});
      } catch (e) {
        fail(e, "Ödeme güncelleme");
      }
    },
    [getOrgId, fail],
  );

  // Çalışan: ödendi bildirimini gördü
  const markPaySeen = useCallback(
    async (ids) => {
      if (!ids.length) return;
      const now = new Date().toISOString();
      setData((p) => ({ ...p, receipts: p.receipts.map((x) => (ids.includes(x.id) ? { ...x, paySeenAt: now } : x)) }));
      try {
        const batch = writeBatch(db);
        ids.forEach((id) => batch.update(doc(db, "orgs", getOrgId(), "receipts", id), { paySeenAt: now }));
        await batch.commit();
      } catch (e) {
        fail(e, "Güncelleme");
      }
    },
    [getOrgId, fail],
  );

  // Kişiler: ayrılanlar (silinenler) listelerde ve atamada çıkmaz; adları arşivde görünsün diye nameOf hepsini bilir
  const activeMembers = useMemo(() => members.filter((m) => m.status !== "left"), [members]);

  // Kişi adı: ben → "Sen", çalışan → adı
  const nameOf = useCallback(
    (id) => (!id ? "" : id === me.current.uid ? "Sen" : members.find((m) => m.uid === id)?.name || (id === me.current.orgId ? "Ana hesap" : "")),
    [members],
  );

  // Fiş fotoğrafını ayrı belgeden okur (yalnızca detay ve düzenlemede)
  const loadReceiptImage = useCallback(async (id) => {
    try {
      const snap = await getDoc(doc(db, "orgs", getOrgId(), "receiptImages", id));
      return snap.exists() ? snap.data().data : null;
    } catch (e) {
      console.error("[DataProvider] fotoğraf okunamadı:", e?.code, e?.message);
      return null;
    }
  }, [getOrgId]);

  return (
    <Ctx.Provider
      value={{
        ...view, loading: !ready, members: staff ? [] : activeMembers, allMembers: staff ? [] : members, nameOf, isStaff: staff, myUid: uid,
        saveDrafts, toggleTask, updateRecord, deleteRecord, removeWithUndo, requestDelete, rejectDelete, saveReceipt, updateReceipt, markPaid, markPaySeen, loadReceiptImage,
        saveBirthday, saveLessons, updateLesson, clearLessons, markSeen, setViewing, setExtraBadge, setMyDone, addReply, isLocked,
      }}
    >
      {/* Veriler gelene kadar açılış ekranı sürer (boş beyaz ekran görünmez) */}
      {ready ? children : <Splash />}
    </Ctx.Provider>
  );
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData, DataProvider içinde kullanılmalı");
  return v;
}

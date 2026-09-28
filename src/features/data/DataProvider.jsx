"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, updateDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/clientApp";
import { useToast } from "@/components/ui/ToastProvider";
import { calcTotals, mismatch } from "@/lib/receipts";

// Veri: orgs/{uid}/plans | tasks | notes | receipts (+ receiptImages). Şimdilik işletme = ana hesabın uid'si.
const KEYS = { plan: "plans", task: "tasks", note: "notes", receipt: "receipts" };
const COLS = Object.values(KEYS);
const EMPTY = { plans: [], tasks: [], notes: [], receipts: [] };
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
  const [uid, setUid] = useState(() => auth.currentUser?.uid ?? null);
  const [data, setData] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  const cur = useRef(data); // geri çağrılarda her zaman güncel veri
  cur.current = data;

  // Oturum değişince dinleyiciler yeniden kurulur
  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);

  const getOrgId = useCallback(() => {
    const id = auth.currentUser?.uid;
    if (!id) throw Object.assign(new Error("Oturum bulunamadı"), { code: "no-auth" });
    return id;
  }, []);

  // Hata olursa kullanıcıya söyle. Ekrandaki iyimser değişikliği canlı dinleyici zaten geri alır.
  const fail = useCallback(
    (e, what) => {
      console.error(`[DataProvider] ${what}:`, e?.code, e?.message);
      toast(
        e?.code === "permission-denied"
          ? "İzin reddedildi. Firestore kurallarını kontrol et."
          : e?.code === "no-auth"
            ? "Oturum bulunamadı, tekrar giriş yap."
            : `${what} başarısız, tekrar dene.`,
      );
    },
    [toast],
  );

  // Canlı dinleme: başka cihazdaki değişiklik de anında görünür
  useEffect(() => {
    if (!uid) {
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
        collection(db, "orgs", uid, k),
        (snap) => {
          setData((p) => ({ ...p, [k]: snap.docs.map((d) => ({ ...d.data(), id: d.id })) }));
          done(k);
        },
        (err) => {
          console.error(`[DataProvider] ${k} okunamadı:`, err.code, err.message);
          if (err.code === "permission-denied") toast("Veri erişimi reddedildi. Firestore kurallarını kontrol et.");
          done(k);
        },
      ),
    );
    const t = setTimeout(() => setReady(true), 3000); // bağlantı yavaşsa ekranı bekletme
    return () => {
      clearTimeout(t);
      unsubs.forEach((u) => u());
    };
  }, [uid, toast]);

  // ---- Plan / görev / not ----
  // Taslak kartları gerçek kayıtlara çevirir. Sonucu hemen döndürür, yazma arka planda biter.
  const saveDrafts = useCallback(
    (drafts, { source, by }) => {
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

      drafts.forEach((d, i) => {
        const base = { ownerId, cat: d.cat || "Genel", src: source, createdBy: by, createdAt: now };
        if (d.type === "plan") {
          const timed = !!d.time;
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
          count.plans++;
        } else {
          const planId = d.link && pid ? pid : null;
          if (d.type === "task") {
            batch.set(doc(db, "orgs", ownerId, "tasks", newId("tasks")), { ...base, title: d.title.trim(), due: d.date || null, done: false, doneAt: null, planId });
            count.tasks++;
          } else {
            batch.set(doc(db, "orgs", ownerId, "notes", newId("notes")), {
              ...base,
              title: (d.title || d.body).trim(),
              body: (d.body || d.title).trim(),
              tags: [],
              planId,
            });
            count.notes++;
          }
        }
      });

      batch.commit().catch((e) => fail(e, "Kaydetme"));
      return count;
    },
    [getOrgId, fail],
  );

  const toggleTask = useCallback(
    async (id) => {
      const target = cur.current.tasks.find((t) => t.id === id);
      if (!target) return;
      const done = !target.done;
      const doneAt = done ? new Date().toISOString() : null;
      setData((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === id ? { ...t, done, doneAt } : t)) }));
      try {
        await updateDoc(doc(db, "orgs", getOrgId(), "tasks", id), { done, doneAt });
      } catch (e) {
        fail(e, "Görev güncelleme");
      }
    },
    [getOrgId, fail],
  );

  const updateRecord = useCallback(
    async (kind, id, patch, by) => {
      const k = KEYS[kind];
      const full = { ...patch, updatedAt: new Date().toISOString(), updatedBy: by };
      setData((p) => ({ ...p, [k]: p[k].map((x) => (x.id === id ? { ...x, ...full } : x)) }));
      try {
        await updateDoc(doc(db, "orgs", getOrgId(), k, id), full);
      } catch (e) {
        fail(e, "Güncelleme");
      }
    },
    [getOrgId, fail],
  );

  const deleteRecord = useCallback(
    async (kind, id) => {
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
    [getOrgId, fail],
  );

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
      batch.set(ref, { ...receiptBody(d), hasImage: !!image, src: src || (image ? "photo" : "manual"), ownerId, createdBy: by, createdAt: now });
      if (image) batch.set(doc(db, "orgs", ownerId, "receiptImages", ref.id), { data: image, createdAt: now });
      batch.commit().catch((e) => fail(e, "Fiş kaydetme"));
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
      if (image) batch.set(imgRef, { data: image, createdAt: now });
      else if (image === null) batch.delete(imgRef);
      batch.commit().catch((e) => fail(e, "Fiş güncelleme"));
    },
    [getOrgId, fail],
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
      value={{ ...data, loading: !ready, saveDrafts, toggleTask, updateRecord, deleteRecord, saveReceipt, updateReceipt, loadReceiptImage }}
    >
      {ready ? children : null}
    </Ctx.Provider>
  );
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData, DataProvider içinde kullanılmalı");
  return v;
}

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { applySize } from "@/lib/textSize";
import { doc, onSnapshot, setDoc as setDocument } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/clientApp";

const Ctx = createContext(null);

// Oturum + profil. Profil users/{uid} belgesinden okunur: role "owner" (ana hesap) | "staff" (çalışan), orgId (işletme).
// Profil belgesi yoksa (konsoldan açılmış ya da eski hesap) kullanıcı kendi işletmesinin sahibidir ve profili bir kez oluşturulur;
// böylece veri yapısı her hesapta aynıdır: users/{uid} = { role: "owner", orgId: uid }. Çalışan profilini yalnızca sunucu yazar.
export function AuthProvider({ children }) {
    const [user, setUser] = useState(undefined); // undefined = henüz bilinmiyor
    const [doc_, setDoc] = useState(null); // users/{uid} içeriği
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubDoc = () => {};
        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            unsubDoc();
            setUser(firebaseUser ?? null);
            setDoc(null);
            if (!firebaseUser) {
                setLoading(false);
                return;
            }
            setLoading(true);
            // Bağlantı yavaşsa bekletme: 3 sn içinde profil gelmezse varsayılanla aç
            const t = setTimeout(() => setLoading(false), 3000);
            unsubDoc = onSnapshot(
                doc(db, "users", firebaseUser.uid),
                (snap) => {
                    clearTimeout(t);
                    setDoc(snap.exists() ? snap.data() : {});
                    setLoading(false);
                    // Sunucudan gelen kesin "yok" bilgisinde (önbellekten değil) ana hesap profilini oluştur
                    if (!snap.exists() && !snap.metadata.fromCache) {
                        setDocument(doc(db, "users", firebaseUser.uid), {
                            name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "",
                            email: firebaseUser.email || "",
                            role: "owner",
                            orgId: firebaseUser.uid,
                            createdAt: new Date().toISOString(),
                        }).catch((e) => console.warn("[auth] profil oluşturulamadı:", e?.code));
                    }
                },
                () => {
                    clearTimeout(t);
                    setDoc({});
                    setLoading(false);
                },
            );
        });
        return () => {
            unsubDoc();
            unsub();
        };
    }, []);

    const profile = user
        ? {
            uid: user.uid,
            name: doc_?.name || user.displayName || user.email?.split("@")[0] || "Kullanıcı",
            email: user.email,
            role: doc_?.role === "staff" ? "staff" : "owner",
            orgId: doc_?.orgId || user.uid,
            kind: doc_?.role === "staff" ? doc_?.kind || "staff" : "owner", // kişi türü (lib/kinds): staff | family | athlete | student | parent | other
            weatherPlace: doc_?.weatherPlace || null, // hava durumu konumu (Ayarlar; cihazlar arası)
            homeTools: Array.isArray(doc_?.homeTools) ? doc_.homeTools : null, // ana sayfada seçili ekstralar (null: seçim yapılmadı)
            athleteIndex: doc_?.athleteIndex || null, // sporcu "ses adları" dizini (yoklamada yapay zekaya gider)
            aiPower: doc_?.aiPower === "strong" ? "strong" : "standard", // ayarlar: güçlü sürüm
            summaryAt: doc_?.summaryAt || "", // ayarlar: sabah özeti saati ("HH:MM", boş = kapalı)
            summaryTomorrow: !!doc_?.summaryTomorrow, // sabah özetine yarını da ekle
            eveningAt: doc_?.eveningAt || "", // ayarlar: akşam (ertesi gün) özeti saati
            summaryHidden: doc_?.summaryHidden || "", // ana ekranda kapatılan özet ("YYYY-MM-DD:morning|evening")
            mailFrom: Array.isArray(doc_?.mailFrom) ? doc_.mailFrom : [], // mail: izlenen gönderenler [{ name, from }]
            mailSeen: doc_?.mailSeen || "", // mail: Gmail betiğinin son kontrolü (ISO; betik yazar)
            mailOutbox: !!doc_?.mailOutbox, // mail: betik kendine mail gönderebilen sürüm (outbox)
            textSize: doc_?.textSize === "l" || doc_?.textSize === "xl" ? doc_.textSize : "", // ayarlar: yazı ve simge boyutu
            introV: Number(doc_?.introV) || (doc_?.onboarded ? 1 : 0), // görülen en son tanıtım sürümü (yeni slaytlar bundan büyük)
            onboarded: doc_ ? !!doc_.onboarded : null, // ilk açılış izin slaytları görüldü mü (null: henüz bilinmiyor)
            tourDone: !!doc_?.tourDone, // "Şimdi sen dene" (asistan düğmesini gösteren yönlendirme) görüldü/denendi mi
        }
        : null;

    // Yazı boyutu başka cihazda değiştiyse burada da uygulansın (profilde yoksa cihazdaki seçim kalır)
    const savedSize = doc_ && "textSize" in doc_ ? String(doc_.textSize) : null;
    useEffect(() => {
        if (savedSize !== null) applySize(savedSize);
    }, [savedSize]);

    // Güçlü sürüm seçimi cihazda da tutulur: her yapay zeka isteğine başlık olarak eklenir (authFetch)
    useEffect(() => {
        try {
            localStorage.setItem("sa-ai-power", doc_?.aiPower === "strong" ? "strong" : "");
        } catch {}
    }, [doc_?.aiPower]);

    const value = {
        user,
        profile,
        role: profile?.role ?? null,
        isOwner: profile?.role === "owner",
        loading,
        error: null,
    };

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
    const v = useContext(Ctx);
    if (!v) throw new Error("useAuth, AuthProvider içinde kullanılmalı");
    return v;
}

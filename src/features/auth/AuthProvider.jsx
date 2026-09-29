"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
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
            homeTools: Array.isArray(doc_?.homeTools) ? doc_.homeTools : null, // ana sayfada seçili ekstralar (null: seçim yapılmadı)
            athleteIndex: doc_?.athleteIndex || null, // sporcu "ses adları" dizini (yoklamada yapay zekaya gider)
        }
        : null;

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

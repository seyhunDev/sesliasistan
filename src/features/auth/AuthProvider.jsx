"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/clientApp";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(undefined); // undefined = henüz bilinmiyor
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser ?? null);
            setLoading(false);
        });
        return unsub;
    }, []);

    const profile = user
        ? {
            uid: user.uid,
            name: user.displayName || user.email?.split("@")[0] || "Kullanıcı",
            email: user.email,
            role: "owner",
        }
        : null;

    const value = {
        user,
        profile,
        role: profile?.role ?? null,
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

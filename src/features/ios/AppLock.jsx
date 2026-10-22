"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Row, Switch } from "@/features/settings/ui";
import { biometry, unlock } from "@/lib/nativeIos";

// Face ID kilidi (iPhone uygulaması; Ayarlar › Hesap › Face ID ile kilit). Açıkken uygulama açılınca ve 1 dakikadan uzun
// arka planda kaldıktan sonra Face ID ister (olmazsa telefon şifresi). Ayar bu telefonda saklanır.
const KEY = "sa-faceid";
const AWAY_MS = 60e3;
const isOn = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

export function AppLock() {
  const [locked, setLocked] = useState(false);
  const busy = useRef(false);
  const hiddenAt = useRef(0);

  const open = async () => {
    if (busy.current) return;
    busy.current = true;
    const ok = await unlock();
    busy.current = false;
    if (ok) setLocked(false);
  };

  useEffect(() => {
    let alive = true;
    const lock = () =>
      biometry().then((t) => {
        if (!alive || !t || !isOn()) return;
        setLocked(true);
        open();
      });
    lock();
    const vis = () => {
      if (document.visibilityState === "hidden") hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > AWAY_MS) lock();
    };
    document.addEventListener("visibilitychange", vis);
    return () => ((alive = false), document.removeEventListener("visibilitychange", vis));
  }, []);

  if (!locked) return null;
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-deep px-8 text-white">
      <p className="text-[1.375rem] font-semibold">Velora kilitli</p>
      <Button onClick={open}>Face ID ile aç</Button>
    </div>
  );
}

// Ayar satırı: yalnız Face ID / Touch ID olan iPhone uygulamasında görünür
export function FaceIdRow() {
  const [type, setType] = useState("");
  const [on, setOn] = useState(false);
  useEffect(() => {
    biometry().then((t) => (setType(t), setOn(isOn())));
  }, []);
  if (!type) return null;
  const name = type === "touchID" ? "Touch ID" : "Face ID";
  const flip = async (v) => {
    if (v && !(await unlock())) return; // açarken bir kez dener: yüz tanınıyor mu
    setOn(v);
    try {
      localStorage.setItem(KEY, v ? "1" : "");
    } catch {}
  };
  return <Row title={`${name} ile kilit`} right={<Switch on={on} onChange={flip} label={`${name} ile kilit`} />} />;
}

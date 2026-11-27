// Sporcu işleri kimde (Seyhun 2026-11-27 "herkes kendi sporcularını yönetsin"): her ana hesap kendi alanında (orgs/{uid}).
// Eskiden yalnız NEXT_PUBLIC_SPORCU_EMAILS listesindeki e-posta. Çalışan, sporcu, veli, kurye ve restoran hesabı değil.
// au: requireUser sonucu
import { profileOf } from "./admin";

export async function ownsAthletes(au) {
  if (!au?.ok || !au.uid || au.staff) return false;
  try {
    return (await profileOf(au.uid)).role === "owner";
  } catch {
    return false;
  }
}

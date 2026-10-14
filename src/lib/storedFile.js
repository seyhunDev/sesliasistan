// Firebase Storage'daki dosyanın künyedeki adresi (saf; künye temizleyicileri kullanır).
// path: "orgs/{org}/{tür}/{id}", url: indirme adresi. İkisi de yoksa dosya eski parçalı düzende (Firestore).
export function storedOf(f) {
  const out = {};
  if (typeof f?.path === "string" && /^orgs\/[\w-]{1,60}\/[\w-]{1,40}\/[\w.-]{1,80}$/.test(f.path)) out.path = f.path;
  if (typeof f?.url === "string" && /^https:\/\/firebasestorage\.googleapis\.com\//.test(f.url) && f.url.length < 1200) out.url = f.url;
  return out.path ? out : {};
}

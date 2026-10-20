export const auth = {}; export const db = {};
export const isFsBroken = (e) => /INTERNAL ASSERTION FAILED/.test(String(e?.message || e || ""));
export const healFirestore = () => {};

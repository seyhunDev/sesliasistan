import { auth } from "@/lib/firebase/clientApp";

export async function authFetch(url, options = {}) {
    const headers = new Headers(options.headers);

    try {
        const user = auth.currentUser;
        if (user) {
            const token = await user.getIdToken();
            headers.set("Authorization", `Bearer ${token}`);
        }
    } catch {
        // Token alınamazsa header boş gider, sunucu 401 döner
    }

    return fetch(url, {
        ...options,
        headers,
    });
}

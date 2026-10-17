export default function manifest() {
    return {
        name: "Sesli Asistan",
        short_name: "Asistan",
        start_url: "/",
        display: "standalone",
        // Uygulama dik kullanılır. Android buna uyar; iPhone ana ekran uygulamasında bunu yok sayar
        // (Safari yön kilitlemeye izin vermez), orada yan çevirince dik düzen ortada aynen kalır.
        orientation: "portrait",
        background_color: "#f4f3ef",
        theme_color: "#f4f3ef",
        icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
    };
}
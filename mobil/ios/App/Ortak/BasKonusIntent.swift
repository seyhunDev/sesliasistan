import AppIntents
import Foundation

// Uygulamanın dışından gelen istek ("talk": asistan dinlesin, "timer": sayacın sayfası açılsın, "go:/yol": widget o sayfayı açsın). Uygulama kapalıysa
// web sayfası yüklenince alır (VeloraPlugin.takeOpen); açıksa VeloraPlugin "open" olayıyla hemen iletir.
enum Bekleyen {
    static let olay = Notification.Name("VeloraBekleyen")
    private static let anahtar = "velora.bekleyen"
    private static let zaman = "velora.bekleyenZaman"

    static func koy(_ ne: String) {
        UserDefaults.standard.set(ne, forKey: anahtar)
        UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: zaman)
        NotificationCenter.default.post(name: olay, object: nil)
    }

    // Bir kez verilir; 2 dakikadan eski istek bayattır
    static func al() -> String? {
        let ne = UserDefaults.standard.string(forKey: anahtar)
        let t = UserDefaults.standard.double(forKey: zaman)
        UserDefaults.standard.removeObject(forKey: anahtar)
        UserDefaults.standard.removeObject(forKey: zaman)
        guard let ne, Date().timeIntervalSince1970 - t < 120 else { return nil }
        return ne
    }

    // velora://bas-konus (Kısayollar, eski iOS), velora://sayac (kilit ekranındaki sayaç), velora://ac/messages (widget: o sayfa açılır, "go:/messages")
    static func url(_ u: URL) {
        guard u.scheme == "velora" else { return }
        switch u.host {
        case "sayac": koy("timer")
        case "ac": koy("go:" + (u.path.isEmpty ? "/" : u.path))
        default: koy("talk")
        }
    }
}

// Bas-konuş: Siri ("Velora dinle"), Eylem tuşu, Kısayollar ve Denetim Merkezi düğmesi bunu çalıştırır.
// Uygulama açılır ve asistan dinlemeye başlar. Hem uygulamada hem pencere öğesi (VeloraWidget) hedefinde derlenir:
// openAppWhenRun ile iş uygulamanın içinde çalışır.
@available(iOS 16.0, *)
struct BasKonusIntent: AppIntent {
    static var title: LocalizedStringResource = "Velora'ya söyle"
    static var description = IntentDescription("Velora açılır ve asistan seni dinler.")
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        Bekleyen.koy("talk")
        return .result()
    }
}

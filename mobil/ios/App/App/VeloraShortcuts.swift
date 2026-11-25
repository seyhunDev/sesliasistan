import AppIntents
import Foundation

// Siri cümleleri ve Eylem tuşu / Kısayollar listesinde görünenler:
// - "Velora'ya söyle": uygulama açılır, asistan dinler (BasKonusIntent)
// - "Velora'ya sor": uygulama açılmaz; Siri ne söyleyeceğini sorar, asistanın cevabını okur. Arabada (CarPlay) ve kilitliyken de olur
//   (Seyhun 2026-10-31). Asistan sorarsa ("Gönderilsin mi?") Siri cevabı da alır, en çok 3 kez
@available(iOS 16.0, *)
struct VeloraShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: VeloraSorIntent(),
            phrases: [
                "\(.applicationName)'ya sor",
                "\(.applicationName) sor",
                "\(.applicationName)'ya bir şey sor",
            ],
            shortTitle: "Velora'ya sor",
            systemImageName: "car.fill"
        )
        AppShortcut(
            intent: BasKonusIntent(),
            phrases: [
                "\(.applicationName) dinle",
                "\(.applicationName)'ya söyle",
                "\(.applicationName) asistan",
            ],
            shortTitle: "Velora'ya söyle",
            systemImageName: "mic.fill"
        )
    }
}

// Uygulamayı açmadan asistana sorar: istek Apple Watch'unkiyle aynı yoldan sayfaya gider (SaatKoprusu.sor, web: WatchBridge.jsx)
@available(iOS 16.0, *)
struct VeloraSorIntent: AppIntent {
    static var title: LocalizedStringResource = "Velora'ya sor"
    static var description = IntentDescription("Uygulamayı açmadan asistana sorar, cevabı Siri okur. Arabada da çalışır.")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Söylenecek", requestValueDialog: "Ne söyleyeyim?")
    var metin: String

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        var soz = metin
        for tur in 0..<4 {
            let c = SiriCevap(json: await SaatKoprusu.shared.sor(soz))
            if c.soru, !c.hata, tur < 3 {
                soz = try await $metin.requestValue("\(c.metin)")
                continue
            }
            return .result(dialog: "\(c.metin)")
        }
        return .result(dialog: "Telefondan devam et.")
    }
}

private struct SiriCevap {
    var metin = "Cevap gelmedi."
    var soru = false
    var hata = true

    init(json: String) {
        guard let d = json.data(using: .utf8), let j = try? JSONSerialization.jsonObject(with: d) as? [String: Any] else { return }
        if let m = j["metin"] as? String, !m.isEmpty { metin = m }
        soru = j["soru"] as? Bool ?? false
        hata = j["hata"] as? Bool ?? false
    }
}

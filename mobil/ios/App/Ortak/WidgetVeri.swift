import Foundation

// Ana ekran widget'ının verisi: uygulama yazar (VeloraPlugin.widgetData), widget okur. Ortak uygulama grubunda durur.
// Rüzgârı widget kendisi open-meteo'dan alır (lat/lon); planlar ancak uygulama açılınca güncellenir.
struct WidgetVeri: Codable {
    struct Plan: Codable, Hashable {
        var title: String
        var date: String // YYYY-MM-DD
        var time: String // HH:MM ya da "" (tüm gün)
        var important: Bool?
    }

    var plans: [Plan]
    var place: String?
    var lat: Double?
    var lon: Double?

    static let grup = "group.com.seyhunyildiz.sesliasistan"
    private static let anahtar = "widgetVeri"

    static func yaz(_ data: Data) {
        UserDefaults(suiteName: grup)?.set(data, forKey: anahtar)
    }

    static func oku() -> WidgetVeri? {
        guard let data = UserDefaults(suiteName: grup)?.data(forKey: anahtar) else { return nil }
        return try? JSONDecoder().decode(WidgetVeri.self, from: data)
    }

    // Planın başlangıcı (telefonun saati); tüm gün planı gün sonuna kadar sürer
    static func baslangic(_ p: Plan) -> Date? {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = p.time.isEmpty ? "yyyy-MM-dd" : "yyyy-MM-dd HH:mm"
        return f.date(from: p.time.isEmpty ? p.date : "\(p.date) \(p.time)")
    }

    // Henüz geçmemiş planlar (saatli: başladıktan 1 saat sonrasına kadar; tüm gün: o gün boyunca)
    func siradaki(_ now: Date = Date()) -> [Plan] {
        plans.filter { p in
            guard let s = WidgetVeri.baslangic(p) else { return false }
            return p.time.isEmpty ? Calendar.current.isDate(s, inSameDayAs: now) || s > now : s.addingTimeInterval(3600) > now
        }
    }
}

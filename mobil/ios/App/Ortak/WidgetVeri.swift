import Foundation

// Widget'ların verisi: uygulama yazar (VeloraPlugin.widgetData; web: lib/widgetData.js), widget'lar okur. Ortak uygulama grubunda durur.
// Rüzgârı widget kendisi open-meteo'dan alır (lat/lon, VeloraWidget/Ruzgar.swift); gerisi ancak uygulama açılınca güncellenir.
struct WidgetVeri: Codable {
    struct Plan: Codable, Hashable {
        var title: String
        var date: String // YYYY-MM-DD
        var time: String // HH:MM ya da "" (tüm gün)
        var important: Bool?
    }

    // Sayaç: çalışıyorsa end (ms, 1970'ten), durduysa paused + left (sn)
    struct Zaman: Codable, Hashable {
        var end: Double
        var paused: Bool?
        var left: Int?
        var title: String
        var bitis: Date { Date(timeIntervalSince1970: end / 1000) }
    }

    struct Mesaj: Codable, Hashable {
        var from: String
        var text: String
    }

    // Ana sayfadaki Hesap satırı: big "12.480 ₺", label "Kasada nakit" / "Banka", sub "Banka 3.200 ₺"
    struct Para: Codable, Hashable {
        var big: String
        var label: String
        var sub: String?
    }

    struct Aidat: Codable, Hashable {
        var paid: Int
        var count: Int
    }

    // Kelime kartı; study: çalışma listesinde, day: kaçıncı gün
    struct Kelime: Codable, Hashable {
        var en: String
        var type: String?
        var tr: String
        var ex: String?
        var exTr: String?
        var study: Bool?
        var day: Int?
    }

    var plans: [Plan]
    var place: String?
    var lat: Double?
    var lon: Double?
    var timer: Zaman?
    var unread: Int?
    var msgs: [Mesaj]?
    var money: Para?
    var dues: Aidat?
    var word: Kelime?

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

    // Sayaç sürüyor mu (durmuşsa da gösterilir; bitiş anından 1 saat sonra düşer)
    func sayac(_ now: Date = Date()) -> Zaman? {
        guard let t = timer else { return nil }
        if t.paused == true { return t }
        return t.bitis.addingTimeInterval(3600) > now ? t : nil
    }

    // Bugünkü (geçmemiş) plan sayısı
    func bugunIs(_ now: Date = Date()) -> Int {
        siradaki(now).filter { WidgetVeri.baslangic($0).map { Calendar.current.isDate($0, inSameDayAs: now) } ?? false }.count
    }
}

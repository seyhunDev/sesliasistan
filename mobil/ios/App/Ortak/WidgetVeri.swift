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

    // Bugünkü ya da sıradaki antrenman (dokununca /training/day?id=… Süre ekranı)
    struct Antrenman: Codable, Hashable {
        var id: String
        var title: String
        var date: String
        var time: String
        var place: String?
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

    // Bugünlerde süren uzak yarış (evden 10 km'den uzak): o günlerde büyük rüzgâr yarışın yerinin, altında ev satırı
    struct Yaris: Codable, Hashable {
        var name: String
        var place: String
        var lat: Double
        var lon: Double
        var start: String // YYYY-MM-DD
        var end: String
    }

    var plans: [Plan]
    var place: String?
    var lat: Double?
    var lon: Double?
    var timer: Zaman?
    var training: Antrenman?
    var trainings: [Antrenman]? // bugünkü ve sıradaki antrenmanlar (en çok 3); eski veride yok
    var money: Para?
    var dues: Aidat?
    var word: Kelime?
    var race: Yaris? // eski veride yok

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

    // Bugünkü ya da sıradaki antrenman: bugünkü gün boyu kalır (bitirilince uygulama listeden çıkarır), sonra sıradaki
    func antrenman(_ now: Date = Date()) -> Antrenman? {
        let bugun = Calendar.current.startOfDay(for: now)
        let liste = trainings ?? (training.map { [$0] } ?? [])
        return liste.first { a in
            guard let s = WidgetVeri.baslangic(Plan(title: a.title, date: a.date, time: "", important: nil)) else { return false }
            return s >= bugun
        }
    }

    // Bugün yarış günü mü (start…end arasında)
    func yaris(_ now: Date = Date()) -> Yaris? {
        guard let y = race else { return nil }
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        let bugun = f.string(from: now)
        return y.start <= bugun && bugun <= (y.end.isEmpty ? y.start : y.end) ? y : nil
    }
}

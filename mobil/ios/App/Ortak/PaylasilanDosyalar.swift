import Foundation

// Paylaş menüsünden ("Share › Velora", Seyhun 2026-11-10: WhatsApp grubuna gelen sonuç PDF'i ya da fotoğrafı) gelen dosyalar.
// VeloraPaylas eki dosyayı ortak klasöre (App Group › Paylasilan) koyar ve Velora'yı açar (velora://paylas); uygulama
// VeloraPlugin.sharedTake ile dosyaları alır ve siler (web: src/features/ios/SharedResults.jsx).
enum Paylasilan {
    static let grup = "group.com.seyhunyildiz.sesliasistan"
    static let enCok = 30 * 1024 * 1024 // daha büyük dosya alınmaz

    static var klasor: URL? {
        guard let kok = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: grup) else { return nil }
        let k = kok.appendingPathComponent("Paylasilan", isDirectory: true)
        try? FileManager.default.createDirectory(at: k, withIntermediateDirectories: true)
        return k
    }

    // "1731250000000-Sonuclar.pdf": başındaki zaman aynı adlı iki dosya çakışmasın ve sıra korunsun diye
    private static func hedef(_ ad: String) -> URL? {
        let temiz = ad.components(separatedBy: CharacterSet(charactersIn: "/\\:")).joined(separator: " ").trimmingCharacters(in: .whitespaces)
        let ms = Int(Date().timeIntervalSince1970 * 1000)
        return klasor?.appendingPathComponent("\(ms)-\(temiz.isEmpty ? "dosya" : String(temiz.prefix(80)))")
    }

    @discardableResult
    static func koy(_ kaynak: URL, ad: String) -> Bool {
        guard let h = hedef(ad) else { return false }
        let boy = (try? kaynak.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
        guard boy <= enCok else { return false }
        do {
            try FileManager.default.copyItem(at: kaynak, to: h)
            return true
        } catch {
            return false
        }
    }

    @discardableResult
    static func koy(veri: Data, ad: String) -> Bool {
        guard veri.count <= enCok, let h = hedef(ad) else { return false }
        return (try? veri.write(to: h)) != nil
    }

    // Bekleyen dosyalar (eskiden yeniye); bir günden eskiler silinir
    static func hepsi() -> [URL] {
        guard let k = klasor, let l = try? FileManager.default.contentsOfDirectory(at: k, includingPropertiesForKeys: [.creationDateKey]) else { return [] }
        let gun = Date().addingTimeInterval(-86400)
        var kalan: [URL] = []
        for u in l {
            let t = (try? u.resourceValues(forKeys: [.creationDateKey]).creationDate) ?? Date()
            if t < gun { try? FileManager.default.removeItem(at: u) } else { kalan.append(u) }
        }
        return kalan.sorted { $0.lastPathComponent < $1.lastPathComponent }
    }
}

import Foundation
import WatchConnectivity

// Telefondaki sayacın saatte görünen hali (src/lib/watchTimer.js watchTimerView)
struct SaatSayac: Codable, Equatable {
    var state: String // run | pause | idle
    var end: Double // ms
    var left: Int
    var dur: Int
    var title: String
    var label: String
    var steps: [Int]
    var lock: Bool

    var bitis: Date { Date(timeIntervalSince1970: end / 1000) }
}

// Telefonun cevabı: asistan için metin (kaydedildi, soru), sayaç için ok
struct TelefonCevabi: Codable, Equatable {
    var metin: String?
    var kaydedildi: Bool?
    var soru: Bool?
    var hata: Bool?
    var ok: Bool?
}

// Saat ile telefon arası (WatchConnectivity). İstek { id, json } gider; telefon hemen alındı der, asıl cevap { cevap: id, json } ile gelir.
// Telefona ulaşılamazsa istek sıraya girer (transferUserInfo), 45 sn içinde cevap yoksa saat söyler.
final class Baglanti: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = Baglanti()

    @Published var sayac: SaatSayac?
    @Published var cevaplar: [String: TelefonCevabi] = [:]
    @Published var uyari = ""

    func baslat() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    // Asistana söylenen; dönen kimlikle cevap beklenir
    func sor(_ metin: String) -> String {
        gonder(["tur": "sor", "metin": metin])
    }

    // is: start (sn) | pause | resume | add (sn ±60) | finish
    func sayacIs(_ is_: String, sn: Int = 0) {
        uyari = ""
        _ = gonder(["tur": "sayac", "is": is_, "sn": sn])
    }

    private func gonder(_ o: [String: Any]) -> String {
        let id = UUID().uuidString
        var o = o
        o["id"] = id
        guard let d = try? JSONSerialization.data(withJSONObject: o), let json = String(data: d, encoding: .utf8) else { return id }
        let m: [String: Any] = ["id": id, "json": json]
        let s = WCSession.default
        if s.activationState == .activated, s.isReachable {
            s.sendMessage(m, replyHandler: { _ in }) { _ in s.transferUserInfo(m) }
        } else {
            s.transferUserInfo(m)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 45) { [weak self] in
            guard let self, self.cevaplar[id] == nil, o["tur"] as? String == "sor" else { return }
            self.cevaplar[id] = TelefonCevabi(metin: "Telefona ulaşılamadı. Velora'yı telefonda açıp yeniden dene.", hata: true)
        }
        return id
    }

    private func al(_ m: [String: Any]) {
        if let json = m["sayac"] as? String, let d = json.data(using: .utf8), let s = try? JSONDecoder().decode(SaatSayac.self, from: d) {
            sayac = s
        }
        if let id = m["cevap"] as? String, let json = m["json"] as? String, let d = json.data(using: .utf8), let c = try? JSONDecoder().decode(TelefonCevabi.self, from: d) {
            if c.ok == false { uyari = c.metin ?? "" }
            cevaplar[id] = c
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        let ctx = session.receivedApplicationContext
        DispatchQueue.main.async { self.al(ctx) }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async { self.al(applicationContext) }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async { self.al(message) }
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        DispatchQueue.main.async { self.al(userInfo) }
    }
}

import Foundation
import WatchConnectivity

// Apple Watch köprüsü (saat: VeloraSaat; web: src/features/ios/WatchBridge.jsx). Saatten gelen istek ({ id, json }) sayfaya
// "watch" olayıyla gider (sayfa yüklenmemişse watchTake ile alınana kadar bekler). Sayfanın cevabı (watchReply) ve sayacın
// durumu (watchState) saate gönderilir. 40 sn içinde cevap gelmezse saate "cevap gelmedi" denir.
// Siri ("Velora'ya sor", VeloraShortcuts.swift) da aynı yoldan sorar: sor() isteği sayfaya koyar, cevabı saate değil Siri'ye döner.
final class SaatKoprusu: NSObject, WCSessionDelegate {
    static let shared = SaatKoprusu()
    static let olay = Notification.Name("VeloraSaatIstegi")

    private var bekleyen: [String] = []
    private var acik: Set<String> = []
    private var yerel: [String: CheckedContinuation<String, Never>] = [:]

    func baslat() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    // Bekleyen istekler (json), bir kez
    func al() -> [String] {
        let l = bekleyen
        bekleyen = []
        return l
    }

    func cevap(_ id: String, json: String) {
        DispatchQueue.main.async {
            if let c = self.yerel.removeValue(forKey: id) { return c.resume(returning: json) }
            guard self.acik.remove(id) != nil else { return }
            self.gonder(["cevap": id, "json": json])
        }
    }

    // Siri'den: asistana sorar, sayfanın cevabını (json: metin, soru, hata) döner. Sayfa çalışmıyorsa (uygulama kapalı) süre dolunca hata
    @MainActor
    func sor(_ metin: String, sure: Double = 40) async -> String {
        let id = "siri-\(UUID().uuidString)"
        let veri = (try? JSONSerialization.data(withJSONObject: ["id": id, "tur": "sor", "metin": metin])) ?? Data()
        let json = String(data: veri, encoding: .utf8) ?? "{}"
        return await withCheckedContinuation { c in
            yerel[id] = c
            bekleyen.append(json)
            NotificationCenter.default.post(name: Self.olay, object: nil)
            DispatchQueue.main.asyncAfter(deadline: .now() + sure) { [weak self] in
                guard let self, let c = self.yerel.removeValue(forKey: id) else { return }
                self.bekleyen.removeAll { $0 == json }
                c.resume(returning: #"{"metin":"Velora telefonda kapalı görünüyor. Bir kez açıp yeniden sor.","hata":true}"#)
            }
        }
    }

    func durum(_ json: String) {
        DispatchQueue.main.async {
            let s = WCSession.default
            guard WCSession.isSupported(), s.activationState == .activated, s.isPaired, s.isWatchAppInstalled else { return }
            try? s.updateApplicationContext(["sayac": json])
            if s.isReachable { s.sendMessage(["sayac": json], replyHandler: nil, errorHandler: nil) }
        }
    }

    private func gelen(_ m: [String: Any]) {
        guard let id = m["id"] as? String, let json = m["json"] as? String, !acik.contains(id) else { return }
        acik.insert(id)
        bekleyen.append(json)
        NotificationCenter.default.post(name: Self.olay, object: nil)
        DispatchQueue.main.asyncAfter(deadline: .now() + 40) { [weak self] in
            guard let self, self.acik.contains(id) else { return }
            self.bekleyen.removeAll { $0 == json }
            self.acik.remove(id)
            self.gonder(["cevap": id, "json": #"{"metin":"Telefondan cevap gelmedi. Velora'yı telefonda açıp yeniden dene.","hata":true}"#])
        }
    }

    private func gonder(_ m: [String: Any]) {
        let s = WCSession.default
        guard s.activationState == .activated else { return }
        if s.isReachable {
            s.sendMessage(m, replyHandler: nil) { _ in s.transferUserInfo(m) }
        } else {
            s.transferUserInfo(m)
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        replyHandler(["alindi": true])
        DispatchQueue.main.async { self.gelen(message) }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async { self.gelen(message) }
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        DispatchQueue.main.async { self.gelen(userInfo) }
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) { session.activate() }
}

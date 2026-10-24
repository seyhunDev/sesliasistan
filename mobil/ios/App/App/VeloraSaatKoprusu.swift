import Foundation
import WatchConnectivity

// Apple Watch köprüsü (saat: VeloraSaat; web: src/features/ios/WatchBridge.jsx). Saatten gelen istek ({ id, json }) sayfaya
// "watch" olayıyla gider (sayfa yüklenmemişse watchTake ile alınana kadar bekler). Sayfanın cevabı (watchReply) ve sayacın
// durumu (watchState) saate gönderilir. 40 sn içinde cevap gelmezse saate "cevap gelmedi" denir.
final class SaatKoprusu: NSObject, WCSessionDelegate {
    static let shared = SaatKoprusu()
    static let olay = Notification.Name("VeloraSaatIstegi")

    private var bekleyen: [String] = []
    private var acik: Set<String> = []

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
            guard self.acik.remove(id) != nil else { return }
            self.gonder(["cevap": id, "json": json])
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

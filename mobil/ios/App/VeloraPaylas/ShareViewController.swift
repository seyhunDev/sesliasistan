import UIKit
import UniformTypeIdentifiers

// Paylaş menüsündeki "Velora" (Seyhun 2026-11-10 "WhatsApp grubuna gelen sonuçları direkt uygulamaya"): PDF ve fotoğraflar
// ortak klasöre konur (Ortak/PaylasilanDosyalar.swift), sonra Velora açılır (velora://paylas) ve orada "Sonuç ekle" penceresi
// çıkar. Velora açılamazsa dosyalar bekler; uygulama bir sonraki açılışta alır.
@objc(ShareViewController)
class ShareViewController: UIViewController {
    private let yazi = UILabel()
    private var basladi = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.043, green: 0.102, blue: 0.2, alpha: 1)
        yazi.text = "Velora'ya gönderiliyor…"
        yazi.textColor = .white
        yazi.font = .systemFont(ofSize: 17, weight: .semibold)
        yazi.textAlignment = .center
        yazi.numberOfLines = 0
        yazi.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(yazi)
        NSLayoutConstraint.activate([
            yazi.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            yazi.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            yazi.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 24),
            yazi.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -24),
        ])
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !basladi else { return }
        basladi = true
        topla { [weak self] n in self?.bitir(n) }
    }

    // Ekler: PDF önce, sonra fotoğraf; en çok 5 dosya
    private func topla(_ son: @escaping (Int) -> Void) {
        let ekler = (extensionContext?.inputItems as? [NSExtensionItem] ?? []).flatMap { $0.attachments ?? [] }
        let grup = DispatchGroup()
        let kilit = NSLock()
        var n = 0
        for ek in ekler.prefix(5) {
            guard let tur = [UTType.pdf, UTType.image].first(where: { ek.hasItemConformingToTypeIdentifier($0.identifier) }) else { continue }
            grup.enter()
            let say = { (oldu: Bool) in
                if oldu { kilit.lock(); n += 1; kilit.unlock() }
                grup.leave()
            }
            ek.loadFileRepresentation(forTypeIdentifier: tur.identifier) { url, _ in
                if let url {
                    // Dosya bu kapanış bitince silinir: hemen kopyalanır
                    return say(Paylasilan.koy(url, ad: Self.ad(ek.suggestedName ?? url.deletingPathExtension().lastPathComponent, url.pathExtension, tur)))
                }
                _ = ek.loadDataRepresentation(forTypeIdentifier: tur.identifier) { veri, _ in
                    guard let veri else { return say(false) }
                    say(Paylasilan.koy(veri: veri, ad: Self.ad(ek.suggestedName ?? "sonuc", "", tur)))
                }
            }
        }
        grup.notify(queue: .main) { son(n) }
    }

    // Adın uzantısı yoksa türden eklenir ("Sonuçlar" → "Sonuçlar.pdf")
    private static func ad(_ ad: String, _ uzanti: String, _ tur: UTType) -> String {
        if !(ad as NSString).pathExtension.isEmpty { return ad }
        let u = uzanti.isEmpty ? (tur.preferredFilenameExtension ?? (tur == .pdf ? "pdf" : "jpg")) : uzanti
        return "\(ad).\(u)"
    }

    private func bitir(_ n: Int) {
        guard n > 0 else {
            yazi.text = "Gönderilemedi. Yalnız PDF ve fotoğraf (en çok 30 MB) gönderilebilir."
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in self?.kapat() }
            return
        }
        let acildi = velorayiAc()
        if !acildi { yazi.text = "Gönderildi. Velora'yı açınca seni bekliyor olacak." }
        DispatchQueue.main.asyncAfter(deadline: .now() + (acildi ? 0.5 : 1.8)) { [weak self] in self?.kapat() }
    }

    private func kapat() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }

    // Paylaşma eki uygulamayı doğrudan açamaz; yanıtlayıcı zincirindeki UIApplication'a openURL:options:completionHandler: iletilir
    // (iOS 18'de eski openURL: çalışmıyor)
    private func velorayiAc() -> Bool {
        guard let url = URL(string: "velora://paylas") else { return false }
        let sec = NSSelectorFromString("openURL:options:completionHandler:")
        var r: UIResponder? = self
        while let x = r {
            if let app = x as? UIApplication, app.responds(to: sec) {
                typealias Ac = @convention(c) (AnyObject, Selector, NSURL, NSDictionary, (@convention(block) (Bool) -> Void)?) -> Void
                let f = unsafeBitCast(app.method(for: sec), to: Ac.self)
                f(app, sec, url as NSURL, NSDictionary(), nil)
                return true
            }
            r = x.next
        }
        return false
    }
}

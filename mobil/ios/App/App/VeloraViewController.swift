import Capacitor
import UIKit
import WebKit

// Uygulamaya özel eklenti (VeloraPlugin) burada kaydedilir; web tarafı window.Capacitor.Plugins.Velora
//
// İnternet kopma ekranı ve beyaz ekran (Seyhun 2026-11-04: "sürekli internet kopma hatası alıyoruz, sayfayı yenilemek ya da
// uygulamayı kapatıp açmak zorunda kalıyorum"):
// - Capacitor her yükleme hatasında "İnternete bağlanılamadı" sayfasını (www/index.html) açıyordu; yarıda kesilen yüklemede de
//   (sayfa kendini yenilerken başka sayfaya geçilmesi, iptal -999, "frame load interrupted" 102). Bunlar artık yok sayılır.
// - Uygulama öne gelince: hata sayfasındaysa ya da sayfa boşsa (iPhone arkadaki web sürecini kapattıysa beyaz ekran kalıyordu)
//   site yeniden açılır. Hata sayfası da internet gelince kendiliğinden yeniden dener.
class VeloraViewController: CAPBridgeViewController {
    private var gezinme: GezinmeKalkani?

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(VeloraPlugin())
        if let w = webView {
            let k = GezinmeKalkani(w.navigationDelegate)
            gezinme = k
            w.navigationDelegate = k
        }
        NotificationCenter.default.addObserver(self, selector: #selector(oneGeldi), name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    private var site: URL? { bridge?.config.serverURL }

    @objc private func oneGeldi() {
        guard let w = webView, let site = site else { return }
        // Hiç sayfa yok ya da hata sayfası açık: siteyi yeniden aç
        guard let url = w.url, url.host == site.host else {
            w.load(URLRequest(url: site))
            return
        }
        if w.isLoading { return }
        // Sayfa var görünüyor ama web süreci ölmüş olabilir (beyaz ekran): küçük bir soru cevapsız kalırsa yeniden yüklenir
        var cevap = false
        w.evaluateJavaScript("document.body ? document.body.childElementCount : 0") { sonuc, hata in
            cevap = true
            if hata != nil || (sonuc as? Int) == 0 { w.reload() }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            if !cevap && !w.isLoading { w.reload() }
        }
    }
}

// Capacitor'ın gezinme yöneticisinin önünde durur: yarıda kesilen yüklemeyi hata saymaz, gerisini olduğu gibi ona iletir.
final class GezinmeKalkani: NSObject, WKNavigationDelegate {
    private weak var asil: WKNavigationDelegate?
    init(_ asil: WKNavigationDelegate?) { self.asil = asil }

    override func responds(to sel: Selector!) -> Bool {
        super.responds(to: sel) || (asil?.responds(to: sel) ?? false)
    }

    override func forwardingTarget(for sel: Selector!) -> Any? {
        asil?.responds(to: sel) == true ? asil : nil
    }

    static func onemsiz(_ e: Error) -> Bool {
        let n = e as NSError
        return (n.domain == NSURLErrorDomain && n.code == NSURLErrorCancelled) || (n.domain == "WebKitErrorDomain" && n.code == 102)
    }

    func webView(_ w: WKWebView, didFail n: WKNavigation!, withError e: Error) {
        if Self.onemsiz(e) { return }
        asil?.webView?(w, didFail: n, withError: e)
    }

    func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) {
        if Self.onemsiz(e) { return }
        asil?.webView?(w, didFailProvisionalNavigation: n, withError: e)
    }
}

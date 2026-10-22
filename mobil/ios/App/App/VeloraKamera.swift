import Capacitor
import UIKit
import UniformTypeIdentifiers

// iPhone kamerası, üstünde akan sayaçla (web: src/features/raceMedia/RecPick.jsx). Seyhun 2026-10-22: "video çekilirken kalan süreyi
// görmedim, keşke görebilseydim". Kamera uygulamanın içinde açıldığı için Dynamic Island'daki sayaç görünmüyordu; burada iPhone'un
// kendi kamera ekranının (UIImagePickerController) üstüne büyük süre yazılır. Dokunuşlar kameraya geçer.
// Girdi: end (ms, sayacın sıfır anı; 0 = sayaç yok), paused, left (sn, durmuşsa), title.
// Sonuç: { path (web'in okuyabileceği adres), kind: photo | video, type, end (ms, kaydın bittiği an) } ya da { cancel: true }
extension VeloraPlugin {
    @objc func camera(_ call: CAPPluginCall) {
        let end = call.getDouble("end", 0) / 1000
        let paused = call.getBool("paused", false)
        let left = call.getInt("left", 0)
        let title = call.getString("title", "")
        DispatchQueue.main.async {
            guard UIImagePickerController.isSourceTypeAvailable(.camera), let vc = self.bridge?.viewController else {
                return call.reject("Kamera yok")
            }
            let p = UIImagePickerController()
            p.sourceType = .camera
            p.mediaTypes = [UTType.movie.identifier, UTType.image.identifier]
            p.cameraCaptureMode = .video
            p.videoQuality = .typeHigh
            p.videoMaximumDuration = 120
            let k = KameraYonetici(call: call, plugin: self)
            p.delegate = k
            KameraYonetici.etkin = k
            if end > 0 || paused {
                let o = SayacKatmani(frame: vc.view.bounds, end: end, paused: paused, left: left, title: title)
                p.cameraOverlayView = o
                k.katman = o
            }
            vc.present(p, animated: true)
        }
    }
}

final class KameraYonetici: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    static var etkin: KameraYonetici?
    let call: CAPPluginCall
    weak var plugin: VeloraPlugin?
    var katman: SayacKatmani?

    init(call: CAPPluginCall, plugin: VeloraPlugin) {
        self.call = call
        self.plugin = plugin
    }

    private func kapat(_ p: UIImagePickerController) {
        katman?.dur()
        p.dismiss(animated: true)
        KameraYonetici.etkin = nil
    }

    func imagePickerControllerDidCancel(_ p: UIImagePickerController) {
        kapat(p)
        call.resolve(["cancel": true])
    }

    func imagePickerController(_ p: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
        kapat(p)
        let tmp = FileManager.default.temporaryDirectory
        let ad = "velora-\(Int(Date().timeIntervalSince1970 * 1000))"
        do {
            if let src = info[.mediaURL] as? URL {
                // Kaydın bittiği an: dosyanın yazıldığı zaman ("Videoyu Kullan"a basılana kadar geçen süre sayılmasın)
                let at = (try? FileManager.default.attributesOfItem(atPath: src.path)[.creationDate] as? Date) ?? Date()
                let ext = src.pathExtension.isEmpty ? "mov" : src.pathExtension.lowercased()
                let dst = tmp.appendingPathComponent("\(ad).\(ext)")
                try? FileManager.default.removeItem(at: dst)
                try FileManager.default.copyItem(at: src, to: dst)
                return cevap(dst, kind: "video", type: ext == "mp4" ? "video/mp4" : "video/quicktime", at: at)
            }
            if let img = info[.originalImage] as? UIImage, let data = img.jpegData(compressionQuality: 0.92) {
                let dst = tmp.appendingPathComponent("\(ad).jpg")
                try data.write(to: dst)
                return cevap(dst, kind: "photo", type: "image/jpeg", at: Date())
            }
            call.reject("Kayıt alınamadı")
        } catch {
            call.reject("Kayıt alınamadı: \(error.localizedDescription)")
        }
    }

    private func cevap(_ url: URL, kind: String, type: String, at: Date) {
        guard let path = plugin?.bridge?.portablePath(fromLocalURL: url)?.absoluteString else { return call.reject("Kayıt okunamadı") }
        call.resolve(["path": path, "kind": kind, "type": type, "name": url.lastPathComponent, "end": at.timeIntervalSince1970 * 1000])
    }
}

// Kameranın üstünde büyük süre: sıfıra kalan (2:59) ya da sıfırdan beri (+1:35); durmuşsa sabit. Dokunuşları kameraya bırakır.
final class SayacKatmani: UIView {
    private let etiket = UILabel()
    private let ust = UILabel()
    private var zaman: Timer?
    private let end: TimeInterval
    private let paused: Bool
    private let left: Int

    init(frame: CGRect, end: TimeInterval, paused: Bool, left: Int, title: String) {
        self.end = end
        self.paused = paused
        self.left = left
        super.init(frame: frame)
        isUserInteractionEnabled = false
        autoresizingMask = [.flexibleWidth, .flexibleHeight]
        let kutu = UIView()
        kutu.backgroundColor = UIColor.black.withAlphaComponent(0.55)
        kutu.layer.cornerRadius = 16
        kutu.translatesAutoresizingMaskIntoConstraints = false
        addSubview(kutu)
        ust.text = title
        ust.font = .systemFont(ofSize: 13, weight: .semibold)
        ust.textColor = UIColor.white.withAlphaComponent(0.8)
        etiket.font = .monospacedDigitSystemFont(ofSize: 44, weight: .bold)
        etiket.textColor = .white
        let yigin = UIStackView(arrangedSubviews: [ust, etiket])
        yigin.axis = .vertical
        yigin.alignment = .center
        yigin.translatesAutoresizingMaskIntoConstraints = false
        kutu.addSubview(yigin)
        NSLayoutConstraint.activate([
            kutu.centerXAnchor.constraint(equalTo: centerXAnchor),
            kutu.topAnchor.constraint(equalTo: safeAreaLayoutGuide.topAnchor, constant: 64),
            yigin.leadingAnchor.constraint(equalTo: kutu.leadingAnchor, constant: 18),
            yigin.trailingAnchor.constraint(equalTo: kutu.trailingAnchor, constant: -18),
            yigin.topAnchor.constraint(equalTo: kutu.topAnchor, constant: 6),
            yigin.bottomAnchor.constraint(equalTo: kutu.bottomAnchor, constant: -6),
        ])
        guncelle()
        if !paused {
            let t = Timer(timeInterval: 0.25, repeats: true) { [weak self] _ in self?.guncelle() }
            RunLoop.main.add(t, forMode: .common)
            zaman = t
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) yok") }

    func dur() {
        zaman?.invalidate()
        zaman = nil
    }

    private static func mmss(_ s: Int) -> String { String(format: "%d:%02d", s / 60, s % 60) }

    private func guncelle() {
        if paused {
            etiket.text = SayacKatmani.mmss(max(0, left))
            return
        }
        let kalan = end - Date().timeIntervalSince1970
        etiket.text = kalan > 0 ? SayacKatmani.mmss(Int(ceil(kalan))) : "+" + SayacKatmani.mmss(Int(-kalan))
        etiket.textColor = kalan > 0 && kalan <= 60 ? UIColor(red: 1, green: 0.45, blue: 0.4, alpha: 1) : .white
    }
}
